from sqlmodel import Session

from app.models import Group, GroupMember, User


def create_random_group(
    db: Session, user: User, is_admin: bool = True, balance: float = 0.0
) -> Group:
    """Create a test group with the specified user as a member."""
    group = Group(name="Test Group", description="Test Description")
    db.add(group)
    db.commit()
    db.refresh(group)

    group_member = GroupMember(
        user_id=user.id, group_id=group.id, is_admin=is_admin, balance=balance
    )
    db.add(group_member)
    db.commit()

    return group


def add_user_to_group(
    db: Session, group: Group, user: User, is_admin: bool = False, balance: float = 0.0
) -> GroupMember:
    """Add a test user to an existing group."""
    group_member = GroupMember(
        user_id=user.id, group_id=group.id, is_admin=is_admin, balance=balance
    )
    db.add(group_member)
    db.commit()
    return group_member
