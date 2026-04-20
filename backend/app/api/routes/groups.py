import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Group,
    GroupCreate,
    GroupMember,
    GroupPublic,
    GroupsPublic,
    Expense,
    ExpenseCreate,
    ExpensePublic,
    ExpenseParticipant,
    Message,
)

router = APIRouter(prefix="/groups", tags=["groups"])


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
        select(Group).join(GroupMember).where(GroupMember.user_id == current_user.id)
    )
    count_statement = select(func.count()).select_from(
        base_query.with_only_columns(Group.id).subquery()
    )
    count = session.exec(count_statement).one()
    groups_statement = (
        base_query.order_by(col(Group.created_at).desc()).offset(skip).limit(limit)
    )
    groups = session.exec(groups_statement).all()
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
        balance=0.0
    )
    session.add(group_member)
    session.commit()
    
    return group


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    member_ids_query = select(GroupMember.user_id).where(GroupMember.group_id == group_id)
    group_member_ids = set(session.exec(member_ids_query).all())

    if current_user.id not in group_member_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a member of this group")
    if expense_in.payer_id not in group_member_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payer is not a member of this group")
    
    participant_ids = {p.user_id for p in expense_in.participants}
    if not participant_ids.issubset(group_member_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more participants are not members of this group")

    amounts_owed = {}
    if expense_in.division_mode == "equitable":
        num_participants = len(participant_ids)
        split_amount = round(expense_in.amount / num_participants, 2)
        for user_id in participant_ids:
            amounts_owed[user_id] = split_amount
        remainder = round(expense_in.amount - sum(amounts_owed.values()), 2)
        if remainder != 0:
            last_participant_id = list(participant_ids)[-1]
            amounts_owed[last_participant_id] += remainder

    elif expense_in.division_mode == "custom":
        total_custom_amount = 0
        for p in expense_in.participants:
            if p.amount is None or p.amount <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Custom amount for user {p.user_id} must be a positive number")
            amounts_owed[p.user_id] = p.amount
            total_custom_amount += p.amount
        
        if not abs(total_custom_amount - expense_in.amount) < 0.01:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sum of custom amounts does not match the total expense amount")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid division mode")

    try:
        db_expense = Expense.model_validate(expense_in, update={"group_id": group_id})
        session.add(db_expense)
        session.flush()

        for user_id, amount_owed in amounts_owed.items():
            participant = ExpenseParticipant(
                expense_id=db_expense.id, user_id=user_id, amount_owed=amount_owed
            )
            session.add(participant)

        group_members_query = select(GroupMember).where(GroupMember.group_id == group_id)
        group_members_map = {gm.user_id: gm for gm in session.exec(group_members_query).all()}

        payer_share = amounts_owed.get(expense_in.payer_id, 0.0)
        group_members_map[expense_in.payer_id].balance += (expense_in.amount - payer_share)

        for user_id, amount_owed_val in amounts_owed.items():
            if user_id != expense_in.payer_id:
                group_members_map[user_id].balance -= amount_owed_val

        session.commit()
        session.refresh(db_expense)

    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not process expense due to an internal error",
        )

    return db_expense


@router.delete("/{group_id}", response_model=Message)
def delete_group(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: uuid.UUID,
) -> Any:
    """
    Delete a group.
    Only a group admin can delete the group and only if all balances are zero.
    """
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
        )

    # Find user role in group (if not superuser)
    if not current_user.is_superuser:
        member_statement = select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == current_user.id
        )
        current_member = session.exec(member_statement).first()

        if not current_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. User is not a member of the group.",
            )

        if not current_member.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. Only group admins can delete the group.",
            )

    # Validate outstanding balances
    members_statement = select(GroupMember).where(GroupMember.group_id == group_id)
    group_members = session.exec(members_statement).all()

    for member in group_members:
        # Use round with 2 decimals to avoid floating point precision issues
        if round(member.balance, 2) != 0.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete group with outstanding balances. All debts must be settled first.",
            )

    session.delete(group)
    session.commit()
    return Message(message="Group deleted successfully")