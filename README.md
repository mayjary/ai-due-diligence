# Enterprise Multi-Document RAG System

A modular, production-style Retrieval-Augmented Generation pipeline built on
LangChain, Ollama, and ChromaDB. Ingests CSV, PDF, TXT, DOCX, Markdown,
JSON, and Excel files from a nested folder structure, and answers questions
over the combined corpus with configurable retrieval and metadata filtering.

This project replaces a single-CSV prototype (`vector.py` + `main.py` that
only handled one restaurant-reviews CSV) with a general-purpose ingestion
and retrieval system.

## Architecture

```
project/
├── data/                 # Drop documents here, organized by folder (Apple/, Tesla/, ...)
├── chroma_db/             # Persisted Chroma vector store + ingest manifest
├── config.py              # ALL tunable values (models, paths, limits, retriever defaults)
├── utils.py                # Logging, path sanitization, hashing, manifest I/O
├── loaders.py              # One function per file type + safe dispatcher
├── splitter.py             # Chunking + chunk-level metadata
├── embeddings.py           # Embedding model factory (Ollama)
├── ingest.py                # File discovery + full ingestion pipeline (CLI)
├── retrieve.py              # Configurable retriever builder + metadata filters
├── chat.py                   # Interactive multi-document chat CLI
└── requirements.txt
```

### Why this shape

- **loaders.py is isolated per file type.** Each loader is independently
  testable and a bug in the DOCX loader can never affect PDF ingestion.
  A single dispatcher (`load_file`) does path validation once, so no
  loader has to re-implement security checks.
- **config.py is the only place with hardcoded values.** Chunk size, models,
  limits, and paths are all read from here (with environment variable
  overrides), so retuning the system never means hunting through multiple
  files.
- **The manifest (`chroma_db/ingest_manifest.json`) makes ingestion
  idempotent.** Every file's SHA-256 hash is recorded after indexing; on
  the next run, unchanged files are skipped entirely, and only new or
  modified files are re-embedded. Chunk IDs are derived from
  `{file_hash}-{chunk_number}`, so re-indexing a changed file overwrites
  its old chunks rather than duplicating them.
- **Metadata is never allowed to crash ingestion.** Every metadata field
  (`company`, `page`, etc.) has a safe fallback (`None`) if it can't be
  derived, per the spec.
- **Every file-reading path goes through `utils.sanitize_path`.** This
  resolves symlinks and rejects any path that escapes `data/`, protecting
  against directory traversal and symlink-escape attacks in one place.

## Setup

```bash
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Pull the models via Ollama
ollama pull mxbai-embed-large
ollama pull qwen3          # or gemma3 / deepseek-r1 / any chat model you configure
```

Place documents under `data/<Category>/...`, e.g.:

```
data/
├── Apple/2025_10k.pdf
├── Tesla/earnings_call.txt
├── Microsoft/vendor_contracts.docx
└── Restaurant/realistic_restaurant_reviews.csv
```

The top-level folder name under `data/` becomes the `company` metadata
field automatically.

## Usage

**1. Ingest documents**

```bash
python ingest.py
python ingest.py --force              # re-index everything, ignoring the manifest
python ingest.py --data-dir ./data/Apple   # ingest a subset
```

**2. Chat over the corpus**

```bash
python chat.py
```

Inside the chat session:

```
:filter company=Apple        # scope to one company
:filter extension=.pdf       # scope to one file type
:filter clear                # remove the active filter
:k 8                         # change number of retrieved chunks
:mmr                         # toggle MMR vs plain similarity search
q                             # quit
```

**3. Use retrieval programmatically**

```python
from retrieve import build_retriever, build_filter

retriever = build_retriever(
    k=5,
    search_type="mmr",
    metadata_filter=build_filter(company="Tesla", extension=".pdf"),
)
results = retriever.invoke("What are the risk factors mentioned?")
```

## Configuration

All of the following are set in `config.py` and can be overridden via
environment variables (see the `RAG_*` names in that file):

| Setting | Default |
|---|---|
| Embedding model | `mxbai-embed-large` |
| LLM | `qwen3` |
| Chunk size / overlap | `1000` / `150` |
| Retriever k | `5` |
| Search type | `similarity` |
| Max file size | `100 MB` |
| Max PDF pages | `2000` |
| Max scan depth | `25` |

## Security notes

- All file access is confined to `config.DATA_DIR` via `utils.sanitize_path`;
  paths that resolve outside it (via `..`, symlinks, or absolute paths) are
  rejected before any file is opened.
- Symlinks encountered while scanning are resolved and checked against the
  data directory boundary; escaping symlinks are skipped and logged.
- File size, PDF page count, Excel row count, and JSON record count are all
  capped (see `config.py`) to bound resource usage from any single file.
- The system never calls `eval`, `exec`, or deserializes untrusted objects.
  Document content is only ever read as text/tabular data, never executed.

## Error handling & logging

Every loader wraps its parsing logic in `try/except` and returns an empty
list on failure rather than raising -- `ingest.py` logs the failure and
moves on to the next file. Logs are written to both stdout and
`logs/rag_system.log`, and cover: documents loaded, chunks created, files
skipped, errors/warnings, and total ingestion time.
# ai-due-diligence
