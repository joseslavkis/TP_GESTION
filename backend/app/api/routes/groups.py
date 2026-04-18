import uuid
from typing import Any
from fastapi import APIRouter, Depends
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Group,
    GroupCreate,
    GroupMember,
    GroupPublic,
    GroupsPublic,
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
    # CA 1 y CA 2: El grupo se instancia. La validación del nombre obligatorio
    # y no vacío se realiza automáticamente en GroupCreate (min_length=1).
    group = Group.model_validate(group_in)
    session.add(group)
    session.commit()
    session.refresh(group)

    # CA 1 y CA 3: Registrar al creador como miembro, administrador y saldo en cero.
    group_member = GroupMember(
        user_id=current_user.id,
        group_id=group.id,
        is_admin=True,
        balance=0.0
    )
    session.add(group_member)
    session.commit()
    
    # No es necesario refrescar group_member, pero retornamos el grupo creado.
    # CA 4: Se cumple implícitamente por el uso de CurrentUser en la firma.
    return group