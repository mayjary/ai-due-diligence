"""Add durable document upload state.

Revision ID: 0003_local_workspace_uploads
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_local_workspace_uploads"
down_revision = "0002_research_persistence"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("documents") as batch:
        batch.add_column(sa.Column("status", sa.String(32), nullable=False, server_default="indexed"))
        batch.add_column(sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("content_hash", sa.String(128)))
        batch.add_column(sa.Column("error_message", sa.Text()))
        batch.add_column(sa.Column("processed_at", sa.DateTime(timezone=True)))
        batch.create_index("ix_documents_status", ["status"])
        batch.create_index("ix_documents_content_hash", ["content_hash"])

    op.create_table(
        "document_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id")),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id")),
        sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_document_jobs_company_id", "document_jobs", ["company_id"])
    op.create_index("ix_document_jobs_document_id", "document_jobs", ["document_id"])
    op.create_index("ix_document_jobs_status", "document_jobs", ["status"])


def downgrade():
    op.drop_table("document_jobs")
    with op.batch_alter_table("documents") as batch:
        batch.drop_index("ix_documents_content_hash")
        batch.drop_index("ix_documents_status")
        batch.drop_column("processed_at")
        batch.drop_column("error_message")
        batch.drop_column("content_hash")
        batch.drop_column("size_bytes")
        batch.drop_column("status")
