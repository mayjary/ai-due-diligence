"""Initial due diligence copilot schema.

Revision ID: 0001_due_diligence_schema
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_due_diligence_schema"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("companies", sa.Column("id", sa.String(36), primary_key=True), sa.Column("name", sa.String(255), nullable=False), sa.Column("ticker", sa.String(32)), sa.Column("sector", sa.String(128)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_companies_name", "companies", ["name"], unique=True)
    op.create_table("documents", sa.Column("id", sa.String(36), primary_key=True), sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False), sa.Column("filename", sa.String(512), nullable=False), sa.Column("document_type", sa.String(64)), sa.Column("fiscal_year", sa.Integer), sa.Column("storage_path", sa.Text), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("chunks", sa.Column("id", sa.String(96), primary_key=True), sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False), sa.Column("chunk_text", sa.Text, nullable=False), sa.Column("page_number", sa.Integer), sa.Column("section_name", sa.String(255)), sa.Column("subsection_name", sa.String(255)), sa.Column("chunk_index", sa.Integer, nullable=False), sa.Column("content_type", sa.String(64)), sa.Column("metadata", sa.JSON, nullable=False), sa.Column("embedding", sa.JSON))
    op.create_table("financial_facts", sa.Column("id", sa.String(36), primary_key=True), sa.Column("company_id", sa.String(36), sa.ForeignKey("companies.id"), nullable=False), sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False), sa.Column("fiscal_year", sa.Integer), sa.Column("metric_name", sa.String(128), nullable=False), sa.Column("metric_category", sa.String(64), nullable=False), sa.Column("value", sa.Float, nullable=False), sa.Column("unit", sa.String(64), nullable=False), sa.Column("currency", sa.String(8), nullable=False), sa.Column("page_number", sa.Integer), sa.Column("section_name", sa.String(255)), sa.Column("source_chunk_id", sa.String(96), sa.ForeignKey("chunks.id")), sa.Column("confidence", sa.Float, nullable=False))
    op.create_table("citations", sa.Column("id", sa.String(36), primary_key=True), sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False), sa.Column("chunk_id", sa.String(96), sa.ForeignKey("chunks.id"), nullable=False), sa.Column("page_number", sa.Integer), sa.Column("section_name", sa.String(255)), sa.Column("source_text", sa.Text, nullable=False))

def downgrade():
    op.drop_table("citations")
    op.drop_table("financial_facts")
    op.drop_table("chunks")
    op.drop_table("documents")
    op.drop_table("companies")
