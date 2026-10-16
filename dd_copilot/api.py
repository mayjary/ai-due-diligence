"""FastAPI API for a privacy-first, user-scoped due-diligence workspace.

Identity lives in the auth store. Documents, vectors, chunks, financial facts,
research and reports live under an isolated local workspace for each user.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_chroma import Chroma
from sqlalchemy import select, func

import config
import embeddings
import retrieve
from dd_copilot.auth import AuthSession, User, _hash_password, authenticate, create_token, init_auth_db, user_from_bearer
from dd_copilot.db.models import Company, Document, DocumentJob, FinancialFact
from dd_copilot.db.session import get_engine, get_session_factory
from dd_copilot.pipeline import CopilotPipeline
from dd_copilot.repository import get_research, list_research, persist_research, get_report, list_reports
from dd_copilot.schemas import CopilotAnswer, EvidencePack, ResearchDetail, ResearchSummary, TimingBreakdown, QueryType
from dd_copilot.workspace import init_workspace, workspace_paths
from ingest import ingest_user_file

app = FastAPI(title="AI Due Diligence Copilot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_pipeline_cache: dict[str, CopilotPipeline] = {}


class AuthRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=256)


class RegisterRequest(AuthRequest):
    name: str = Field(min_length=1, max_length=255)
    organization: str | None = Field(default=None, max_length=255)
    accepted_terms: bool = False


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    ticker: str | None = None
    sector: str | None = None


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=20_000)
    company: str | None = None


def current_user(authorization: str | None = Header(default=None)) -> User:
    return user_from_bearer(authorization)


def _user_workspace(user: User):
    return init_workspace(user.id, claim_legacy=False)


def _session_factory(user: User):
    paths = workspace_paths(user.id)
    init_workspace(user.id, claim_legacy=False)
    return get_session_factory(f"sqlite:///{paths['db']}")


def _vector_store(user: User) -> Chroma:
    paths = workspace_paths(user.id)
    paths["chroma"].mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=config.COLLECTION_NAME,
        persist_directory=str(paths["chroma"]),
        embedding_function=embeddings.get_embedding_function(),
    )


def _get_pipeline(user: User) -> CopilotPipeline:
    if user.id not in _pipeline_cache:
        _pipeline_cache[user.id] = CopilotPipeline(
            vector_store=_vector_store(user),
            session_factory=_session_factory(user),
        )
    return _pipeline_cache[user.id]


def _company_name_from_request_or_answer(request_company: str | None, answer: CopilotAnswer) -> str | None:
    if request_company:
        return request_company
    return next((c.company for c in answer.evidence_pack.evidence_chunks if c.company), None)


def _serialize_user(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "organization": user.organization, "created_at": user.created_at.isoformat()}


@app.on_event("startup")
def startup() -> None:
    init_auth_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(request: RegisterRequest):
    if not request.accepted_terms:
        raise HTTPException(status_code=400, detail="You must accept the Terms of Service and Privacy Policy")
    init_auth_db()
    email = request.email.strip().lower()
    with AuthSession() as session:
        if session.scalar(select(User).where(User.email == email)) is not None:
            raise HTTPException(status_code=409, detail="An account with that email already exists")
        is_first_user = session.scalar(select(func.count(User.id))) == 0
        user = User(name=request.name.strip(), email=email, organization=request.organization, password_hash=_hash_password(request.password))
        session.add(user)
        session.commit()
        session.refresh(user)
        user_id = user.id
    init_workspace(user_id, claim_legacy=is_first_user)
    return {"user": _serialize_user(user), "token": create_token(user_id)}


@app.post("/api/auth/login")
def login(request: AuthRequest):
    user = authenticate(request.email, request.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    init_workspace(user.id, claim_legacy=False)
    return {"user": _serialize_user(user), "token": create_token(user.id)}


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return _serialize_user(user)


@app.post("/api/auth/logout")
def logout(user: User = Depends(current_user)):
    # Bearer tokens are stateless; the browser removes the token. This endpoint
    # exists so the UI has a clean, auditable logout action.
    return {"success": True}


@app.get("/api/companies")
def companies(user: User = Depends(current_user)):
    factory = _session_factory(user)
    with factory() as session:
        rows = session.query(Company).order_by(Company.name).all()
        return [
            {
                "id": c.id, "name": c.name, "ticker": c.ticker, "sector": c.sector,
                "created_at": c.created_at.isoformat(), "documents_count": len(c.documents),
            }
            for c in rows
        ]


@app.post("/api/companies")
def create_company(request: CompanyCreate, user: User = Depends(current_user)):
    factory = _session_factory(user)
    with factory() as session:
        existing = session.scalar(select(Company).where(func.lower(Company.name) == request.name.strip().lower()))
        if existing:
            return {"id": existing.id, "name": existing.name, "ticker": existing.ticker, "sector": existing.sector}
        company = Company(name=request.name.strip(), ticker=request.ticker, sector=request.sector)
        session.add(company)
        session.commit()
        session.refresh(company)
        return {"id": company.id, "name": company.name, "ticker": company.ticker, "sector": company.sector}


@app.post("/ask", response_model=CopilotAnswer)
def ask(request: AskRequest, user: User = Depends(current_user)):
    try:
        answer = _get_pipeline(user).ask(request.question, request.company)
        company_name = _company_name_from_request_or_answer(request.company, answer)
        with _session_factory(user)() as session:
            research = persist_research(session, answer, company_name)
        answer.research_id = research.id
        return answer
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Copilot query failed: {exc}") from exc


@app.get("/api/research", response_model=list[ResearchSummary])
def research_history(company: str | None = None, limit: int = 50, user: User = Depends(current_user)):
    limit = max(1, min(limit, 200))
    with _session_factory(user)() as session:
        rows = list_research(session, company, limit)
        return [
            ResearchSummary(
                id=r.id, query=r.query, company_id=r.company_id,
                company_name=r.company.name, query_type=QueryType(r.query_type), status=r.status,
                confidence=r.confidence, citations_valid=r.citations_valid, created_at=r.created_at.isoformat(),
                total_ms=(r.timings_json or {}).get("total_ms"),
            ) for r in rows
        ]


@app.get("/api/research/{research_id}", response_model=ResearchDetail)
def research_detail(research_id: str, user: User = Depends(current_user)):
    with _session_factory(user)() as session:
        row = get_research(session, research_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Research run not found")
        return ResearchDetail(
            id=row.id, query=row.query, company_id=row.company_id, company_name=row.company.name,
            query_type=QueryType(row.query_type), status=row.status, confidence=row.confidence,
            citations_valid=row.citations_valid, created_at=row.created_at.isoformat(),
            total_ms=(row.timings_json or {}).get("total_ms"), answer=row.answer,
            confidence_reason=row.confidence_reason, warnings=row.warnings_json or [],
            evidence_pack=EvidencePack.model_validate(row.evidence_pack_json or {}),
            timings=TimingBreakdown.model_validate(row.timings_json or {}),
        )


@app.get("/api/documents")
def documents(company: str | None = None, user: User = Depends(current_user)):
    with _session_factory(user)() as session:
        query = session.query(Document, Company).join(Company)
        if company:
            query = query.filter((Company.id == company) | (Company.name == company))
        rows = query.order_by(Document.created_at.desc()).all()
        return [
            {
                "id": d.id, "filename": d.filename, "company_id": d.company_id,
                "company_name": c.name, "document_type": d.document_type, "fiscal_year": d.fiscal_year,
                "storage_path": d.storage_path, "status": d.status, "size_bytes": d.size_bytes,
                "error_message": d.error_message, "created_at": d.created_at.isoformat(),
                "processed_at": d.processed_at.isoformat() if d.processed_at else None,
                "chunk_count": len(d.chunks),
            } for d, c in rows
        ]


@app.get("/api/documents/jobs/{job_id}")
def document_job(job_id: str, user: User = Depends(current_user)):
    with _session_factory(user)() as session:
        job = session.get(DocumentJob, job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Upload job not found")
        return {
            "id": job.id, "filename": job.filename, "company_id": job.company_id,
            "document_id": job.document_id, "status": job.status, "progress": job.progress,
            "error_message": job.error_message, "created_at": job.created_at.isoformat(),
            "updated_at": job.updated_at.isoformat(),
        }


def _update_job(user: User, job_id: str, **values) -> None:
    with _session_factory(user)() as session:
        job = session.get(DocumentJob, job_id)
        if job:
            for key, value in values.items():
                setattr(job, key, value)
            job.updated_at = datetime.now(timezone.utc)
            session.commit()


def _process_upload(user_id: str, job_id: str, path: str, company_id: str) -> None:
    user = None
    with AuthSession() as session:
        user = session.get(User, user_id)
    if user is None:
        return
    file_path = Path(path)
    try:
        _update_job(user, job_id, status="processing", progress=10)
        result = ingest_user_file(file_path, _vector_store(user), _session_factory(user))
        _update_job(user, job_id, status="indexed", progress=100)
        with _session_factory(user)() as session:
            doc = session.scalar(select(Document).where(Document.company_id == company_id, Document.filename == file_path.name).order_by(Document.created_at.desc()))
            if doc:
                doc.status = "indexed"
                doc.size_bytes = file_path.stat().st_size
                doc.content_hash = result["hash"]
                doc.processed_at = datetime.now(timezone.utc)
                session.commit()
                _update_job(user, job_id, document_id=doc.id)
        try:
            file_path.unlink(missing_ok=True)
        except OSError:
            pass
    except Exception as exc:
        _update_job(user, job_id, status="failed", progress=100, error_message=str(exc))
        with _session_factory(user)() as session:
            doc = session.scalar(select(Document).where(Document.company_id == company_id, Document.filename == file_path.name).order_by(Document.created_at.desc()))
            if doc:
                doc.status = "failed"
                doc.error_message = str(exc)
                session.commit()


@app.post("/api/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    company_id: str = Form(...),
    document_type: str = Form("Other"),
    fiscal_year: int | None = Form(default=None),
    user: User = Depends(current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A filename is required")
    if Path(file.filename).suffix.lower() not in config.SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Supported: {sorted(config.SUPPORTED_EXTENSIONS)}")

    paths = workspace_paths(user.id)
    company_dir = paths["data"] / company_id
    company_dir.mkdir(parents=True, exist_ok=True)
    destination = company_dir / Path(file.filename).name
    temp = destination.with_suffix(destination.suffix + ".uploading")

    size = 0
    try:
        with temp.open("wb") as out:
            while True:
                chunk = await file.read(8 * 1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > config.MAX_FILE_SIZE_BYTES:
                    raise HTTPException(status_code=413, detail=f"File exceeds {config.MAX_FILE_SIZE_MB} MB limit")
                out.write(chunk)
        temp.replace(destination)
    except HTTPException:
        temp.unlink(missing_ok=True)
        raise
    except Exception as exc:
        temp.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Could not store upload locally: {exc}") from exc
    finally:
        await file.close()

    with _session_factory(user)() as session:
        company = session.get(Company, company_id)
        if company is None:
            destination.unlink(missing_ok=True)
            raise HTTPException(status_code=404, detail="Company not found")
        job = DocumentJob(filename=destination.name, company_id=company.id, status="queued", progress=0)
        session.add(job)
        session.commit()
        session.refresh(job)
        job_id = job.id

    background_tasks.add_task(_process_upload, user.id, job_id, str(destination), company_id)
    return {"success": True, "job_id": job_id, "filename": destination.name, "size_bytes": size, "storage": "local"}


@app.get("/api/dashboard")
def dashboard(user: User = Depends(current_user)):
    with _session_factory(user)() as session:
        latest_research = session.scalar(select(func.max(Document.created_at)))
        company = session.query(Company).order_by(Company.created_at.desc()).first()
        if not company:
            return {"company": None, "financials": [], "segments": [], "recent_research": []}
        facts = session.query(FinancialFact).filter(FinancialFact.company_id == company.id).all()
        years = sorted({f.fiscal_year for f in facts if f.fiscal_year})
        annual = []
        by_year = {}
        for year in years:
            rows = {f.metric_name: f.value for f in facts if f.fiscal_year == year}
            revenue = rows.get("total_revenue")
            op = rows.get("operating_income")
            net = rows.get("net_income")
            ocf = rows.get("operating_cash_flow")
            capex = rows.get("capex")
            point = {
                "year": year, "revenue": revenue, "operatingIncome": op, "netIncome": net,
                "operatingCashFlow": ocf, "freeCashFlow": (ocf - capex) if ocf is not None and capex is not None else None,
                "operatingMargin": (op / revenue * 100) if op is not None and revenue else None,
                "netMargin": (net / revenue * 100) if net is not None and revenue else None,
                "revenueGrowth": None,
            }
            by_year[year] = point
            annual.append(point)
        for i, point in enumerate(annual):
            if i:
                prev = annual[i - 1].get("revenue")
                if prev and point.get("revenue") is not None:
                    point["revenueGrowth"] = (point["revenue"] - prev) / prev * 100
        latest = annual[-1] if annual else {}
        segments = []
        for metric, label in [("iphone_revenue", "iPhone"), ("services_revenue", "Services"), ("wearables_revenue", "Wearables, Home and Accessories"), ("mac_revenue", "Mac"), ("ipad_revenue", "iPad")]:
            value = next((f.value for f in facts if f.metric_name == metric and f.fiscal_year == (years[-1] if years else None)), None)
            if value is not None:
                segments.append({"name": label, "revenue": value, "year": years[-1]})
        research_rows = list_research(session, limit=10)
        return {
            "company": {"id": company.id, "name": company.name, "ticker": company.ticker, "sector": company.sector, "documents_count": len(company.documents)},
            "financials": annual,
            "latest": latest,
            "segments": segments,
            "recent_research": [
                {"id": r.id, "query": r.query, "company_id": r.company_id, "company_name": r.company.name, "confidence": r.confidence, "created_at": r.created_at.isoformat()}
                for r in research_rows
            ],
        }


@app.get("/api/reports")
def reports(limit: int = 50, user: User = Depends(current_user)):
    with _session_factory(user)() as session:
        rows = list_reports(session, limit=max(1, min(limit, 200)))
        return [{
            "id": r.id, "company_id": r.company_id, "company_name": r.company.name,
            "title": r.title, "report_type": r.report_type, "status": r.status,
            "summary": r.summary, "confidence": r.confidence,
            "source_research_id": r.source_research_id,
            "created_at": r.created_at.isoformat(), "updated_at": r.updated_at.isoformat(),
            "sections_count": len(r.sections),
        } for r in rows]


@app.get("/api/reports/{report_id}")
def report_detail(report_id: str, user: User = Depends(current_user)):
    with _session_factory(user)() as session:
        r = get_report(session, report_id)
        if r is None:
            raise HTTPException(status_code=404, detail="Report not found")
        return {
            "id": r.id, "company_id": r.company_id, "company_name": r.company.name,
            "title": r.title, "report_type": r.report_type, "status": r.status,
            "summary": r.summary, "confidence": r.confidence, "source_research_id": r.source_research_id,
            "created_at": r.created_at.isoformat(), "updated_at": r.updated_at.isoformat(),
            "sections": [{"id": s.id, "section_type": s.section_type, "title": s.title, "content": s.content, "order_index": s.order_index, "metadata": s.metadata_json} for s in r.sections],
        }
