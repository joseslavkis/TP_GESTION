import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.group import create_random_group, add_user_to_group
from tests.utils.user import create_random_user

def test_delete_group_success_empty_balances(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    """
    CA 1: Successful deletion without outstanding balances
    """
    # Create user dynamically from token headers or use the fixture setup to get the actual user
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    current_user_id = r.json()["id"]
    from app.models import User
    current_user = db.get(User, current_user_id)

    # 1. Arrange: Create group with zero balance for admin
    group = create_random_group(db=db, user=current_user, is_admin=True, balance=0.0)

    # 2. Act: Delete the group
    response = client.delete(
        f"{settings.API_V1_STR}/groups/{group.id}",
        headers=normal_user_token_headers,
    )

    # 3. Assert
    assert response.status_code == 200
    assert response.json()["message"] == "Group deleted successfully"

    # CA 4 Check: The group no longer exists
    r_list = client.get(f"{settings.API_V1_STR}/groups/", headers=normal_user_token_headers)
    assert r_list.status_code == 200
    groups_list = r_list.json()["data"]
    assert len([g for g in groups_list if g["id"] == str(group.id)]) == 0

def test_delete_group_fails_with_outstanding_balances(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    """
    CA 2: Restriction by outstanding balances
    """
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    current_user_id = r.json()["id"]
    from app.models import User
    current_user = db.get(User, current_user_id)

    # 1. Arrange: Create group and admin has a non-zero balance (e.g. they owe money or are owed money)
    # We set admin balance to 10.5
    group = create_random_group(db=db, user=current_user, is_admin=True, balance=10.5)

    # 2. Act: Try to delete the group
    response = client.delete(
        f"{settings.API_V1_STR}/groups/{group.id}",
        headers=normal_user_token_headers,
    )

    # 3. Assert
    assert response.status_code == 400
    assert "Cannot delete group with outstanding balances" in response.json()["detail"]


def test_delete_group_forbidden_if_not_admin(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    """
    CA 3: Restriction by permissions
    """
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    current_user_id = r.json()["id"]
    from app.models import User
    current_user = db.get(User, current_user_id)

    # 1. Arrange: Create a group where the user is NOT an admin
    group = create_random_group(db=db, user=current_user, is_admin=False, balance=0.0)

    # 2. Act: Try to delete the group
    response = client.delete(
        f"{settings.API_V1_STR}/groups/{group.id}",
        headers=normal_user_token_headers,
    )

    # 3. Assert
    assert response.status_code == 403
    assert "Only group admins can delete the group" in response.json()["detail"]


def test_delete_group_forbidden_if_not_member(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    """Extra test: Ensure a completely unrelated user cannot delete the group."""
    # 1. Arrange: Completely distinct random user creates the group
    other_user = create_random_user(db)
    group = create_random_group(db=db, user=other_user, is_admin=True, balance=0.0)

    # 2. Act: Current user tries to delete the other user's group
    response = client.delete(
        f"{settings.API_V1_STR}/groups/{group.id}",
        headers=normal_user_token_headers,
    )

    # 3. Assert
    assert response.status_code == 403
    assert "User is not a member of the group" in response.json()["detail"]


def test_delete_group_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Extra test: Handle group not found gracefully."""
    fake_id = uuid.uuid4()
    response = client.delete(
        f"{settings.API_V1_STR}/groups/{fake_id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Group not found"
