import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import GroupMember
from tests.utils.user import authentication_token_from_email, create_random_user


def test_create_group_expense_is_split_across_all_group_members(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group_response = client.post(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
        json={"name": "Viaje", "description": "Gastos compartidos"},
    )
    assert group_response.status_code == 200
    group = group_response.json()
    group_id = uuid.UUID(group["id"])

    current_user_response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
    )
    current_user = current_user_response.json()

    second_user = create_random_user(db)
    db.add(
        GroupMember(
            user_id=second_user.id,
            group_id=group_id,
            is_admin=False,
            balance=0.0,
        )
    )
    db.commit()

    expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Supermercado",
            "amount": 100,
            "payer_id": current_user["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert expense_response.status_code == 200
    expense = expense_response.json()
    assert expense["group_id"] == group["id"]
    assert expense["payer_id"] == current_user["id"]
    assert len(expense["participants"]) == 2
    assert sorted(participant["amount_owed"] for participant in expense["participants"]) == [
        50.0,
        50.0,
    ]

    payer_groups_response = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
    )
    assert payer_groups_response.status_code == 200
    payer_group = payer_groups_response.json()["data"][0]
    assert payer_group["current_user_balance"] == 50.0

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user.email, db=db
    )
    second_user_groups_response = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=second_user_headers,
    )
    assert second_user_groups_response.status_code == 200
    second_user_group = second_user_groups_response.json()["data"][0]
    assert second_user_group["current_user_balance"] == -50.0


def test_list_current_user_group_expenses_returns_group_debt(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group_response = client.post(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
        json={"name": "Casa", "description": "Servicios"},
    )
    assert group_response.status_code == 200
    group = group_response.json()
    group_id = uuid.UUID(group["id"])

    owner_response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
    )
    owner = owner_response.json()

    second_user = create_random_user(db)
    db.add(
        GroupMember(
            user_id=second_user.id,
            group_id=group_id,
            is_admin=False,
            balance=0.0,
        )
    )
    db.commit()

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user.email, db=db
    )

    expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Internet",
            "amount": 80,
            "payer_id": owner["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert expense_response.status_code == 200

    my_expenses_response = client.get(
        f"{settings.API_V1_STR}/groups/me/expenses",
        headers=second_user_headers,
    )
    assert my_expenses_response.status_code == 200
    content = my_expenses_response.json()
    assert content["count"] >= 1

    matching_expense = next(
        expense for expense in content["data"] if expense["group_id"] == group["id"]
    )
    assert matching_expense["group_name"] == "Casa"
    assert matching_expense["description"] == "Internet"
    assert matching_expense["current_user_amount_owed"] == 40.0

    group_expenses_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=second_user_headers,
    )
    assert group_expenses_response.status_code == 200
    group_expenses = group_expenses_response.json()
    assert group_expenses["count"] >= 1
    assert group_expenses["data"][0]["group_id"] == group["id"]
