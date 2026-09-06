"""
chat.py
=======
Entry point: `python chat.py`

Interactive command-line chat over the full multi-document corpus. Supports
simple in-session filter commands so a user can scope questions to a
specific company or file type without restarting the process.

Pipeline (when reasoning enabled):
    question → retriever → financial reasoning layer → answer synthesis

Commands (typed instead of a question):
    :filter company=Apple
    :filter extension=.pdf
    :filter clear
    :k 8
    :mmr           (toggle MMR vs similarity search)
    :reasoning     (toggle reasoning trace display)
    q              (quit)
"""

from __future__ import annotations

import time

from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import OllamaLLM

import config
import retrieve
import utils
from dd_copilot.pipeline import CopilotPipeline
from financial_reasoning.formatters import format_reasoning_for_display, format_reasoning_for_prompt
from financial_reasoning.pipeline import FinancialReasoningPipeline, format_document_context
from financial_reasoning.prompts import ANSWER_WITH_REASONING_PROMPT

logger = utils.logger

PROMPT_TEMPLATE = """You are an expert assistant answering questions using only the
provided context, which was retrieved from a multi-document knowledge base
covering multiple companies and document types.

Context (each excerpt is labeled with its source file):
{context}

Question: {question}

Instructions:
- Answer using only the information in the context above.
- If the context does not contain the answer, say so explicitly.
- Cite the source file(s) you used when relevant.
"""


def format_context(documents) -> str:
    """Render retrieved chunks with their source metadata for the prompt."""
    return format_document_context(documents)


def _backend_estimated_time() -> str | None:
    """Configured backend estimate, or None → footer displays N/A."""
    if config.PERFORMANCE_ESTIMATED_SECONDS is None:
        return None
    return utils.format_duration_seconds(config.PERFORMANCE_ESTIMATED_SECONDS)


def _append_performance_footer(answer: str, elapsed_seconds: float) -> str:
    """Append backend-computed timing footer (never LLM-generated)."""
    return (
        f"{answer.rstrip()}"
        f"{utils.format_performance_footer(
            estimated_time=_backend_estimated_time(),
            elapsed_time=utils.format_duration_seconds(elapsed_seconds),
        )}"
    )


def _parse_filter_command(command_text: str) -> dict[str, str] | None:
    """Parse ':filter key=value' into a dict, or None for ':filter clear'."""
    remainder = command_text[len(":filter"):].strip()
    if remainder == "clear" or not remainder:
        return None
    key, _, value = remainder.partition("=")
    key, value = key.strip(), value.strip()
    if not key or not value:
        logger.warning("Could not parse filter command: %s", command_text)
        return None
    return {key: value}


def run_chat() -> None:
    """Main interactive loop."""
    llm = OllamaLLM(model=config.LLM_MODEL, base_url=config.OLLAMA_BASE_URL)
    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    legacy_chain = prompt | llm

    reasoning_prompt = ChatPromptTemplate.from_template(ANSWER_WITH_REASONING_PROMPT)
    reasoning_chain = reasoning_prompt | llm

    reasoning_pipeline = FinancialReasoningPipeline() if config.REASONING_ENABLED and not config.COPILOT_ENABLED else None

    vector_store = retrieve.get_vector_store()
    copilot_pipeline = CopilotPipeline(vector_store=vector_store) if config.COPILOT_ENABLED else None

    active_filter: dict | None = None
    k = config.RETRIEVER_DEFAULT_K
    search_type = config.RETRIEVER_DEFAULT_SEARCH_TYPE
    show_reasoning = config.REASONING_SHOW_TRACE

    mode_label = "hybrid retrieval + one-call copilot" if copilot_pipeline else ("reasoning + synthesis" if config.REASONING_ENABLED else "direct RAG")
    print(
        f"Multi-document RAG chat [{mode_label}]. "
        "Type 'q' to quit, ':filter key=value' to scope, ':mmr' to toggle MMR.\n"
    )

    while True:
        print("---------------------------")
        user_input = input("Ask your question (q to quit): ").strip()

        if not user_input:
            continue
        if user_input == "q":
            break

        if user_input.startswith(":filter"):
            active_filter = _parse_filter_command(user_input)
            print(f"[filter set to: {active_filter}]")
            continue

        if user_input.startswith(":k"):
            try:
                k = int(user_input.split()[1])
                print(f"[k set to {k}]")
            except (IndexError, ValueError):
                print("[usage: :k <number>]")
            continue

        if user_input == ":mmr":
            search_type = "mmr" if search_type == "similarity" else "similarity"
            print(f"[search_type set to {search_type}]")
            continue

        if user_input == ":reasoning":
            show_reasoning = not show_reasoning
            print(f"[reasoning trace display: {'on' if show_reasoning else 'off'}]")
            continue

        request_started = time.perf_counter()

        # The copilot owns retrieval, calculation, one LLM call, citation
        # validation, and stage timing. Its vector/BM25 branches are parallel.
        if copilot_pipeline is not None:
            try:
                company = active_filter.get("company") if active_filter else None
                result = copilot_pipeline.ask(user_input, company=company)
                elapsed_seconds = time.perf_counter() - request_started
                rendered = f"{result.answer}\n\nConfidence: {result.confidence:.0%} — {result.confidence_reason}"
                if result.warnings:
                    rendered += "\nWarnings: " + "; ".join(result.warnings)
                rendered += "\nTimings (ms): " + ", ".join(f"{key}={value}" for key, value in result.timings.model_dump().items() if value is not None)
                print(f"\n{_append_performance_footer(rendered, elapsed_seconds)}\n")
            except Exception as exc:
                logger.exception("Copilot pipeline failed: %s", exc)
                elapsed_seconds = time.perf_counter() - request_started
                print(_append_performance_footer("Sorry, the copilot failed to generate an answer. Check logs for details.", elapsed_seconds))
            continue

        try:
            retriever = retrieve.build_retriever(
                vector_store=vector_store,
                k=k,
                search_type=search_type,
                metadata_filter=active_filter,
            )
            retrieved_docs = retriever.invoke(user_input)
        except Exception as exc:
            logger.error("Retrieval failed: %s", exc)
            elapsed_seconds = time.perf_counter() - request_started
            message = _append_performance_footer(
                "Sorry, retrieval failed. Check the logs for details.",
                elapsed_seconds,
            )
            print(message)
            continue

        context = format_context(retrieved_docs)

        try:
            if reasoning_pipeline is not None:
                reasoning_result = reasoning_pipeline.run(user_input, retrieved_docs)

                if show_reasoning:
                    print("\n--- Financial Reasoning ---")
                    print(format_reasoning_for_display(reasoning_result))
                    print("--- End Reasoning ---\n")

                reasoning_text = format_reasoning_for_prompt(reasoning_result)
                answer = reasoning_chain.invoke({
                    "question": user_input,
                    "reasoning": reasoning_text,
                    "context": context,
                })
            else:
                answer = legacy_chain.invoke({"context": context, "question": user_input})
        except Exception as exc:
            logger.error("LLM generation failed: %s", exc)
            elapsed_seconds = time.perf_counter() - request_started
            message = _append_performance_footer(
                "Sorry, the model failed to generate an answer. Check the logs for details.",
                elapsed_seconds,
            )
            print(message)
            continue

        elapsed_seconds = time.perf_counter() - request_started
        answer_with_footer = _append_performance_footer(str(answer), elapsed_seconds)
        print(f"\n{answer_with_footer}\n")


if __name__ == "__main__":
    run_chat()
