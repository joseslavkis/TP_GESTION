import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class GroupMember(SQLModel, table=True):
    user_id: uuid.UUID = Field(
        foreign_key="user.id", ondelete="CASCADE", primary_key=True
    )
    group_id: uuid.UUID = Field(
        foreign_key="group.id", ondelete="CASCADE", primary_key=True
    )
    is_admin: bool = Field(default=False)  # CA 1: Identifica si es administrador
    balance: float = Field(default=0.0)  # CA 3: Saldos iniciales en cero
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    groups: list["Group"] = Relationship(
        back_populates="members", link_model=GroupMember
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UserProfileInfo(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None = None
    display_name: str
    initial: str


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class GroupBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class Group(GroupBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    members: list["User"] = Relationship(
        back_populates="groups", link_model=GroupMember
    )
    expenses: list["Expense"] = Relationship(
        back_populates="group", cascade_delete=True
    )
    settlement_payments: list["SettlementPayment"] = Relationship(
        back_populates="group", cascade_delete=True
    )


class GroupCreate(GroupBase):
    pass


class GroupUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class GroupMemberCreate(BaseModel):
    email: EmailStr
    is_admin: bool = False


class GroupMemberPublic(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: str | None = None
    is_admin: bool
    balance: float
    joined_at: datetime


class GroupPublic(GroupBase):
    id: uuid.UUID
    created_at: datetime
    current_user_balance: float


class GroupDetailPublic(GroupPublic):
    members: list[GroupMemberPublic]
    settlement_payments: list["SettlementPaymentPublic"]


class GroupsPublic(SQLModel):
    data: list[GroupPublic]
    count: int


class ExpenseParticipant(SQLModel, table=True):
    expense_id: uuid.UUID = Field(
        foreign_key="expense.id", ondelete="CASCADE", primary_key=True
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", ondelete="CASCADE", primary_key=True
    )
    amount_owed: float

    expense: "Expense" = Relationship(back_populates="participants")
    user: "User" = Relationship()


class ExpenseBase(SQLModel):
    description: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0)


class Expense(ExpenseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    group_id: uuid.UUID = Field(foreign_key="group.id", ondelete="CASCADE")
    group: "Group" = Relationship(back_populates="expenses")
    payer_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    payer: "User" = Relationship()
    participants: list[ExpenseParticipant] = Relationship(
        back_populates="expense", cascade_delete=True
    )


class SettlementPaymentBase(SQLModel):
    amount: Decimal = Field(gt=0, max_digits=12)

    @field_validator("amount", mode="after")
    @classmethod
    def round_amount(cls, value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class SettlementPayment(SettlementPaymentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    group_id: uuid.UUID = Field(foreign_key="group.id", ondelete="CASCADE")
    from_user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    to_user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")

    group: Group = Relationship(back_populates="settlement_payments")


class SettlementPaymentCreate(SettlementPaymentBase):
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID


class SettlementPaymentPublic(SettlementPaymentBase):
    amount: float
    id: uuid.UUID
    group_id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    created_at: datetime


class ExpenseParticipantIn(BaseModel):
    user_id: uuid.UUID
    amount: float | None = Field(default=None, gt=0)


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0)
    payer_id: uuid.UUID
    participants: list[ExpenseParticipantIn] = Field(default_factory=list)
    division_mode: Literal["equitable", "custom"]


class ExpenseParticipantPublic(BaseModel):
    user_id: uuid.UUID
    amount_owed: float


class ExpensePublic(ExpenseBase):
    id: uuid.UUID
    group_id: uuid.UUID
    payer_id: uuid.UUID
    created_at: datetime
    participants: list[ExpenseParticipantPublic]


class ExpensesPublic(SQLModel):
    data: list[ExpensePublic]
    count: int


class UserExpensePublic(BaseModel):
    expense_id: uuid.UUID
    group_id: uuid.UUID
    group_name: str
    description: str
    amount: float
    payer_id: uuid.UUID
    created_at: datetime
    current_user_amount_owed: float


class UserExpensesPublic(SQLModel):
    data: list[UserExpensePublic]
    count: int
