import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import Session, col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Expense,
    ExpenseCreate,
    ExpenseParticipant,
    ExpenseParticipantPublic,
    ExpensePublic,
    ExpensesPublic,
    Group,
    GroupCreate,
    GroupDetailPublic,
    GroupMember,
    GroupMemberCreate,
    GroupMemberPublic,
    GroupPublic,
    GroupsPublic,
    GroupUpdate,
    Message,
    User,
    UserExpensePublic,
    UserExpensesPublic,
)

router = APIRouter(prefix="/groups", tags=["groups"])


def _build_expense_public(
    expense: Expense, participants: list[ExpenseParticipant]
) -> ExpensePublic:
    return ExpensePublic(
        id=expense.id,
        description=expense.description,
        amount=expense.amount,
        group_id=expense.group_id,
        payer_id=expense.payer_id,
        created_at=expense.created_at,
        participants=[
            ExpenseParticipantPublic(
                user_id=participant.user_id,
                amount_owed=participant.amount_owed,
            )
            for participant in participants
        ],
    )


def _build_group_member_public(member: GroupMember, user: User) -> GroupMemberPublic:
    return GroupMemberPublic(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=member.is_admin,
        balance=member.balance,
        joined_at=member.joined_at,
    )


def _get_membership(
    session: Session, group_id: uuid.UUID, user_id: uuid.UUID
) -> GroupMember | None:
    return session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    ).first()


def _require_membership(
    session: Session, group_id: uuid.UUID, current_user: User
) -> GroupMember:
    membership = _get_membership(session, group_id, current_user.id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this group",
        )
    return membership


def _require_group_admin(
    session: Session, group_id: uuid.UUID, current_user: User
) -> GroupMember:
    membership = _require_membership(session, group_id, current_user)
    if not membership.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can perform this action",
        )
    return membership


def _build_group_detail(
    session: Session, group: Group, balance: float
) -> GroupDetailPublic:
    member_rows = session.exec(
        select(GroupMember, User)
        .join(User, col(User.id) == col(GroupMember.user_id))
        .where(col(GroupMember.group_id) == group.id)
        .order_by(col(GroupMember.joined_at))
    ).all()

    return GroupDetailPublic(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        current_user_balance=balance,
        members=[
            _build_group_member_public(member, user) for member, user in member_rows
        ],
    )


@router.get("/", response_model=GroupsPublic)
def list_user_groups(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Listar los grupos del usuario autenticado.
    """
    base_query = (
        select(Group, GroupMember.balance)
        .join(GroupMember, col(Group.id) == col(GroupMember.group_id))
        .where(col(GroupMember.user_id) == current_user.id)
    )
    count_statement = select(func.count()).select_from(
        base_query.with_only_columns(col(Group.id)).subquery()
    )
    count = session.exec(count_statement).one()
    groups_statement = (
        base_query.order_by(col(Group.created_at).desc()).offset(skip).limit(limit)
    )
    groups_with_balance = session.exec(groups_statement).all()
    groups = [
        GroupPublic(
            id=group.id,
            name=group.name,
            description=group.description,
            created_at=group.created_at,
            current_user_balance=balance,
        )
        for group, balance in groups_with_balance
    ]
    return GroupsPublic(data=groups, count=count)


@router.post("/", response_model=GroupPublic)
def create_group(
    *, session: SessionDep, current_user: CurrentUser, group_in: GroupCreate
) -> Any:
    """
    Crear un nuevo grupo.
    """
    group = Group.model_validate(group_in)
    session.add(group)
    session.commit()
    session.refresh(group)

    group_member = GroupMember(
        user_id=current_user.id,
        group_id=group.id,
        is_admin=True,
        balance=0.0,
    )
    session.add(group_member)
    session.commit()

    return GroupPublic(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        current_user_balance=0.0,
    )


@router.get("/{group_id}", response_model=GroupDetailPublic)
def read_group(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Any:
    """
    Obtener detalle de un grupo y sus integrantes.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )
    membership = _require_membership(session, group_id, current_user)
    return _build_group_detail(session, group, membership.balance)


@router.patch("/{group_id}", response_model=GroupDetailPublic)
def update_group(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    group_in: GroupUpdate,
) -> Any:
    """
    Editar configuracion basica de un grupo.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )
    membership = _require_group_admin(session, group_id, current_user)
    update_data = group_in.model_dump(exclude_unset=True)
    group.sqlmodel_update(update_data)
    session.add(group)
    session.commit()
    session.refresh(group)
    return _build_group_detail(session, group, membership.balance)


@router.delete("/{group_id}", response_model=Message)
def delete_group(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Message:
    """
    Eliminar un grupo.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )
    _require_group_admin(session, group_id, current_user)
    session.delete(group)
    session.commit()
    return Message(message="Group deleted successfully")


@router.post("/{group_id}/members", response_model=GroupMemberPublic)
def add_group_member(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    member_in: GroupMemberCreate,
) -> Any:
    """
    Anadir participante a un grupo por email.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )
    _require_group_admin(session, group_id, current_user)

    user = session.exec(select(User).where(User.email == member_in.email)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    existing_membership = _get_membership(session, group_id, user.id)
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this group",
        )

    member = GroupMember(
        user_id=user.id,
        group_id=group_id,
        is_admin=member_in.is_admin,
        balance=0.0,
    )
    session.add(member)
    session.commit()
    session.refresh(member)
    return _build_group_member_public(member, user)


@router.delete("/{group_id}/members/{user_id}", response_model=Message)
def remove_group_member(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Message:
    """
    Quitar participante de un grupo.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )
    _require_group_admin(session, group_id, current_user)
    member = _get_membership(session, group_id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group member not found"
        )

    if abs(member.balance) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove a member with a non-zero balance",
        )

    if member.is_admin:
        admins_count = session.exec(
            select(func.count())
            .select_from(GroupMember)
            .where(
                GroupMember.group_id == group_id,
                GroupMember.is_admin == True,  # noqa: E712
            )
        ).one()
        if admins_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A group must keep at least one admin",
            )

    session.delete(member)
    session.commit()
    return Message(message="Group member removed successfully")


@router.get("/me/expenses", response_model=UserExpensesPublic)
def list_current_user_group_expenses(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Listar todos los gastos de los grupos del usuario con el monto que le corresponde.
    """
    base_query = (
        select(Expense, Group.name, ExpenseParticipant.amount_owed)
        .join(Group, col(Group.id) == col(Expense.group_id))
        .join(
            GroupMember,
            (col(GroupMember.group_id) == col(Expense.group_id))
            & (col(GroupMember.user_id) == current_user.id),
        )
        .outerjoin(
            ExpenseParticipant,
            (col(ExpenseParticipant.expense_id) == col(Expense.id))
            & (col(ExpenseParticipant.user_id) == current_user.id),
        )
    )
    count_statement = select(func.count()).select_from(
        base_query.with_only_columns(col(Expense.id)).subquery()
    )
    count = session.exec(count_statement).one()
    expenses_statement = (
        base_query.order_by(col(Expense.created_at).desc()).offset(skip).limit(limit)
    )
    rows = session.exec(expenses_statement).all()
    expenses = [
        UserExpensePublic(
            expense_id=expense.id,
            group_id=expense.group_id,
            group_name=group_name,
            description=expense.description,
            amount=expense.amount,
            payer_id=expense.payer_id,
            created_at=expense.created_at,
            current_user_amount_owed=amount_owed or 0.0,
        )
        for expense, group_name, amount_owed in rows
    ]
    return UserExpensesPublic(data=expenses, count=count)


@router.get("/{group_id}/expenses", response_model=ExpensesPublic)
def list_group_expenses(
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Listar los gastos de un grupo para sus miembros.
    """
    membership = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this group",
        )

    count_statement = (
        select(func.count()).select_from(Expense).where(Expense.group_id == group_id)
    )
    count = session.exec(count_statement).one()
    expenses = session.exec(
        select(Expense)
        .where(Expense.group_id == group_id)
        .order_by(col(Expense.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()

    participants = (
        session.exec(
            select(ExpenseParticipant).where(
                col(ExpenseParticipant.expense_id).in_(
                    [expense.id for expense in expenses]
                )
            )
        ).all()
        if expenses
        else []
    )
    participants_by_expense: dict[uuid.UUID, list[ExpenseParticipant]] = {}
    for participant in participants:
        participants_by_expense.setdefault(participant.expense_id, []).append(
            participant
        )

    return ExpensesPublic(
        data=[
            _build_expense_public(expense, participants_by_expense.get(expense.id, []))
            for expense in expenses
        ],
        count=count,
    )


@router.post("/{group_id}/expenses", response_model=ExpensePublic)
def create_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
    expense_in: ExpenseCreate,
) -> Any:
    """
    Registrar un nuevo gasto en un grupo.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )

    member_ids_query = select(GroupMember.user_id).where(
        GroupMember.group_id == group_id
    )
    group_member_ids = set(session.exec(member_ids_query).all())

    if current_user.id not in group_member_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this group",
        )
    if expense_in.payer_id not in group_member_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payer is not a member of this group",
        )

    amounts_owed: dict[uuid.UUID, float] = {}
    if expense_in.division_mode == "equitable":
        num_participants = len(group_member_ids)
        split_amount = round(expense_in.amount / num_participants, 2)
        for user_id in group_member_ids:
            amounts_owed[user_id] = split_amount
        remainder = round(expense_in.amount - sum(amounts_owed.values()), 2)
        if remainder != 0:
            last_participant_id = next(reversed(tuple(group_member_ids)))
            amounts_owed[last_participant_id] += remainder
    elif expense_in.division_mode == "custom":
        if not expense_in.participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom division requires participants",
            )
        participant_ids = [
            participant.user_id for participant in expense_in.participants
        ]
        if len(participant_ids) != len(set(participant_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participants must be unique",
            )
        if not set(participant_ids).issubset(group_member_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more participants are not members of this group",
            )

        total_custom_amount = 0.0
        for participant in expense_in.participants:
            if participant.amount is None or participant.amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Custom amount for user {participant.user_id} must be a positive number"
                    ),
                )
            amounts_owed[participant.user_id] = participant.amount
            total_custom_amount += participant.amount

        if not abs(total_custom_amount - expense_in.amount) < 0.01:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sum of custom amounts does not match the total expense amount",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid division mode"
        )

    try:
        db_expense = Expense(
            description=expense_in.description,
            amount=expense_in.amount,
            payer_id=expense_in.payer_id,
            group_id=group_id,
        )
        session.add(db_expense)
        session.flush()

        participants_list: list[ExpenseParticipant] = []
        for user_id, amount_owed in amounts_owed.items():
            expense_participant = ExpenseParticipant(
                expense_id=db_expense.id, user_id=user_id, amount_owed=amount_owed
            )
            session.add(expense_participant)
            participants_list.append(expense_participant)

        group_members_query = select(GroupMember).where(
            GroupMember.group_id == group_id
        )
        group_members_map = {
            group_member.user_id: group_member
            for group_member in session.exec(group_members_query).all()
        }

        payer_share = amounts_owed.get(expense_in.payer_id, 0.0)
        group_members_map[expense_in.payer_id].balance += (
            expense_in.amount - payer_share
        )

        for user_id, amount_owed in amounts_owed.items():
            if user_id != expense_in.payer_id:
                group_members_map[user_id].balance -= amount_owed

        session.commit()
        session.refresh(db_expense)
    except Exception as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {exc}",
        ) from exc

    return _build_expense_public(db_expense, participants_list)
