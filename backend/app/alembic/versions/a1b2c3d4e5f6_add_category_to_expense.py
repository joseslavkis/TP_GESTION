"""Add category to expense

Revision ID: a1b2c3d4e5f6
Revises: 3d6c57d9d1b2
Create Date: 2026-05-11 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "3d6c57d9d1b2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "expense",
        sa.Column("category", sa.String(length=50), nullable=False, server_default="'otros'"),
    )


def downgrade():
    op.drop_column("expense", "category")
