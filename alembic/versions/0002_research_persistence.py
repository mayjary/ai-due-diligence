"""Persist research runs, findings, generated evidence, and report structure.

Revision ID: 0002_research_persistence
Revises: 0001_due_diligence_schema
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_research_persistence"
down_revision = "0001_due_diligence_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "research",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("query", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False, server_default=""),
        sa.Column("query_type", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="completed"),
        sa.Column("confidence", sa.Float, nullable=False, server_default="0"),
        sa.Column("confidence_reason", sa.Text, nullable=False, server_default=""),
        sa.Column("citations_valid", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("model", sa.String(128)),
        sa.Column("timings", sa.JSON, nullable=False),
        sa.Column("warnings", sa.JSON, nullable=False),
        sa.Column("evidence_pack", sa.JSON, nullable=False),
        sa.Column("pipeline_metadata", sa.JSON, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_research_company_id", "research", ["company_id"])
    op.create_index("ix_research_query_type", "research", ["query_type"])
    op.create_index("ix_research_status", "research", ["status"])

    op.create_table(
        "research_findings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("research_id", sa.String(36), sa.ForeignKey("research.id"), nullable=False),
        sa.Column("finding_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("value", sa.Float),
        sa.Column("unit", sa.String(64)),
        sa.Column("confidence", sa.Float, nullable=False, server_default="0"),
        sa.Column("severity", sa.String(32)),
        sa.Column("direction", sa.String(32)),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_research_findings_research_id", "research_findings", ["research_id"])
    op.create_index("ix_research_findings_finding_type", "research_findings", ["finding_type"])

    op.create_table(
        "research_citations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("research_id", sa.String(36), sa.ForeignKey("research.id"), nullable=False),
        sa.Column("finding_id", sa.String(36), sa.ForeignKey("research_findings.id")),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("chunk_id", sa.String(96), sa.ForeignKey("chunks.id"), nullable=False),
        sa.Column("page_number", sa.Integer),
        sa.Column("section_name", sa.String(255)),
        sa.Column("source_text", sa.Text, nullable=False),
        sa.Column("relevance_score", sa.Float, nullable=False, server_default="0"),
        sa.Column("validation_status", sa.String(32), nullable=False, server_default="validated"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_research_citations_research_id", "research_citations", ["research_id"])
    op.create_index("ix_research_citations_finding_id", "research_citations", ["finding_id"])
    op.create_index("ix_research_citations_document_id", "research_citations", ["document_id"])
    op.create_index("ix_research_citations_chunk_id", "research_citations", ["chunk_id"])

    op.create_table(
        "reports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("report_type", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("summary", sa.Text, nullable=False, server_default=""),
        sa.Column("confidence", sa.Float),
        sa.Column("source_research_id", sa.String(36), sa.ForeignKey("research.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_reports_company_id", "reports", ["company_id"])
    op.create_index("ix_reports_report_type", "reports", ["report_type"])
    op.create_index("ix_reports_status", "reports", ["status"])

    op.create_table(
        "report_sections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("report_id", sa.String(36), sa.ForeignKey("reports.id"), nullable=False),
        sa.Column("section_type", sa.String(64), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column("order_index", sa.Integer, nullable=False, server_default="0"),
        sa.Column("metadata", sa.JSON, nullable=False),
    )
    op.create_index("ix_report_sections_report_id", "report_sections", ["report_id"])


def downgrade():
    op.drop_table("report_sections")
    op.drop_table("reports")
    op.drop_table("research_citations")
    op.drop_table("research_findings")
    op.drop_table("research")
