import uuid
from typing import Any, cast

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import GroupMember
from tests.utils.user import authentication_token_from_email, create_random_user


def _create_group(
    client: TestClient,
    headers: dict[str, str],
    name: str = "Viaje",
    description: str = "Gastos compartidos",
) -> dict[str, Any]:
    response = client.post(
        f"{settings.API_V1_STR}/groups/",
        headers=headers,
        json={"name": name, "description": description},
    )
    assert response.status_code == 200
    return cast(dict[str, Any], response.json())


def _get_current_user(client: TestClient, headers: dict[str, str]) -> dict[str, Any]:
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert response.status_code == 200
    return cast(dict[str, Any], response.json())


def _add_member_directly(db: Session, group_id: uuid.UUID) -> tuple[str, uuid.UUID]:
    user = create_random_user(db)
    db.add(
        GroupMember(
            user_id=user.id,
            group_id=group_id,
            is_admin=False,
            balance=0.0,
        )
    )
    db.commit()
    return user.email, user.id


def test_create_group_expense_is_split_across_all_group_members(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])

    current_user = _get_current_user(client, normal_user_token_headers)

    second_user_email, _ = _add_member_directly(db, group_id)

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
    assert sorted(
        participant["amount_owed"] for participant in expense["participants"]
    ) == [
        50.0,
        50.0,
    ]

    payer_groups_response = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
    )
    assert payer_groups_response.status_code == 200
    payer_group = next(
        item
        for item in payer_groups_response.json()["data"]
        if item["id"] == group["id"]
    )
    assert payer_group["current_user_balance"] == 50.0

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )
    second_user_groups_response = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=second_user_headers,
    )
    assert second_user_groups_response.status_code == 200
    second_user_group = next(
        item
        for item in second_user_groups_response.json()["data"]
        if item["id"] == group["id"]
    )
    assert second_user_group["current_user_balance"] == -50.0


def test_list_current_user_group_expenses_returns_group_debt(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(
        client, normal_user_token_headers, name="Casa", description="Servicios"
    )
    group_id = uuid.UUID(group["id"])

    owner = _get_current_user(client, normal_user_token_headers)

    second_user_email, _ = _add_member_directly(db, group_id)

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
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


def test_group_detail_member_management_update_and_delete(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(
        client,
        normal_user_token_headers,
        name="Cena",
        description="Salida grupal",
    )

    second_user = create_random_user(db)
    add_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=normal_user_token_headers,
        json={"email": second_user.email, "is_admin": False},
    )
    assert add_member_response.status_code == 200
    added_member = add_member_response.json()
    assert added_member["email"] == second_user.email
    assert added_member["balance"] == 0.0

    detail_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}",
        headers=normal_user_token_headers,
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["name"] == "Cena"
    assert len(detail["members"]) == 2

    update_response = client.patch(
        f"{settings.API_V1_STR}/groups/{group['id']}",
        headers=normal_user_token_headers,
        json={"name": "Cena actualizada", "description": "Nueva descripcion"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Cena actualizada"

    remove_member_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/members/{second_user.id}",
        headers=normal_user_token_headers,
    )
    assert remove_member_response.status_code == 200

    delete_group_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}",
        headers=normal_user_token_headers,
    )
    assert delete_group_response.status_code == 200


def test_group_access_requires_existing_group_and_membership(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    outsider = create_random_user(db)
    outsider_headers = authentication_token_from_email(
        client=client, email=outsider.email, db=db
    )

    missing_group_response = client.get(
        f"{settings.API_V1_STR}/groups/{uuid.uuid4()}",
        headers=normal_user_token_headers,
    )
    assert missing_group_response.status_code == 404
    assert missing_group_response.json()["detail"] == "Group not found"

    outsider_group_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}",
        headers=outsider_headers,
    )
    assert outsider_group_response.status_code == 403
    assert (
        outsider_group_response.json()["detail"] == "User is not a member of this group"
    )

    outsider_expenses_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=outsider_headers,
    )
    assert outsider_expenses_response.status_code == 403


def test_group_admin_actions_require_admin_and_validate_members(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    second_user = create_random_user(db)

    add_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=normal_user_token_headers,
        json={"email": second_user.email, "is_admin": False},
    )
    assert add_member_response.status_code == 200

    duplicate_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=normal_user_token_headers,
        json={"email": second_user.email, "is_admin": False},
    )
    assert duplicate_member_response.status_code == 409
    assert (
        duplicate_member_response.json()["detail"]
        == "User is already a member of this group"
    )

    missing_user_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=normal_user_token_headers,
        json={"email": "missing-user@example.com", "is_admin": False},
    )
    assert missing_user_response.status_code == 404
    assert missing_user_response.json()["detail"] == "User not found"

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user.email, db=db
    )
    update_response = client.patch(
        f"{settings.API_V1_STR}/groups/{group['id']}",
        headers=second_user_headers,
        json={"name": "Intento sin permisos"},
    )
    assert update_response.status_code == 403
    assert (
        update_response.json()["detail"] == "Only group admins can perform this action"
    )

    add_by_non_admin_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=second_user_headers,
        json={"email": create_random_user(db).email, "is_admin": False},
    )
    assert add_by_non_admin_response.status_code == 403


def test_group_member_removal_validates_balance_admins_and_missing_member(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    current_user = _get_current_user(client, normal_user_token_headers)

    remove_last_admin_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/members/{current_user['id']}",
        headers=normal_user_token_headers,
    )
    assert remove_last_admin_response.status_code == 400
    assert remove_last_admin_response.json()["detail"] == (
        "A group must keep at least one admin"
    )

    missing_member_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/members/{uuid.uuid4()}",
        headers=normal_user_token_headers,
    )
    assert missing_member_response.status_code == 404
    assert missing_member_response.json()["detail"] == "Group member not found"

    _, indebted_user_id = _add_member_directly(db, group_id)
    member = db.get(GroupMember, (indebted_user_id, group_id))
    assert member
    member.balance = -10.0
    db.add(member)
    db.commit()

    remove_indebted_member_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/members/{indebted_user_id}",
        headers=normal_user_token_headers,
    )
    assert remove_indebted_member_response.status_code == 400
    assert remove_indebted_member_response.json()["detail"] == (
        "Cannot remove a member with a non-zero balance"
    )


def test_create_custom_expense_updates_balances(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    payer = _get_current_user(client, normal_user_token_headers)
    second_user_email, second_user_id = _add_member_directly(db, group_id)

    expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Entradas",
            "amount": 100,
            "payer_id": payer["id"],
            "division_mode": "custom",
            "participants": [
                {"user_id": payer["id"], "amount": 30},
                {"user_id": str(second_user_id), "amount": 70},
            ],
        },
    )
    assert expense_response.status_code == 200
    expense = expense_response.json()
    assert sorted(
        participant["amount_owed"] for participant in expense["participants"]
    ) == [30.0, 70.0]

    payer_groups_response = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
    )
    assert payer_groups_response.status_code == 200
    payer_group = next(
        item
        for item in payer_groups_response.json()["data"]
        if item["id"] == group["id"]
    )
    assert payer_group["current_user_balance"] == 70.0

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )
    second_user_groups_response = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=second_user_headers,
    )
    assert second_user_groups_response.status_code == 200
    second_user_group = next(
        item
        for item in second_user_groups_response.json()["data"]
        if item["id"] == group["id"]
    )
    assert second_user_group["current_user_balance"] == -70.0


def test_create_settlement_payment_supports_partial_and_total_payments(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    creditor = _get_current_user(client, normal_user_token_headers)
    debtor_email, debtor_id = _add_member_directly(db, group_id)

    expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Supermercado",
            "amount": 100,
            "payer_id": creditor["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert expense_response.status_code == 200

    debtor_headers = authentication_token_from_email(
        client=client, email=debtor_email, db=db
    )

    partial_payment_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=debtor_headers,
        json={
            "from_user_id": str(debtor_id),
            "to_user_id": creditor["id"],
            "amount": 20,
        },
    )
    assert partial_payment_response.status_code == 200
    partial_payment = partial_payment_response.json()
    assert partial_payment["group_id"] == group["id"]
    assert partial_payment["amount"] == 20.0

    debtor_group_detail_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}", headers=debtor_headers
    )
    assert debtor_group_detail_response.status_code == 200
    debtor_group_detail = debtor_group_detail_response.json()
    assert debtor_group_detail["current_user_balance"] == -30.0
    assert len(debtor_group_detail["settlement_payments"]) == 1
    assert debtor_group_detail["settlement_payments"][0]["amount"] == 20.0

    total_payment_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=debtor_headers,
        json={
            "from_user_id": str(debtor_id),
            "to_user_id": creditor["id"],
            "amount": 30,
        },
    )
    assert total_payment_response.status_code == 200
    assert total_payment_response.json()["amount"] == 30.0

    creditor_group_detail_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}", headers=normal_user_token_headers
    )
    assert creditor_group_detail_response.status_code == 200
    creditor_group_detail = creditor_group_detail_response.json()
    assert creditor_group_detail["current_user_balance"] == 0.0
    assert len(creditor_group_detail["settlement_payments"]) == 2

    debtor_group_detail_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}", headers=debtor_headers
    )
    assert debtor_group_detail_response.status_code == 200
    assert debtor_group_detail_response.json()["current_user_balance"] == 0.0


def test_create_settlement_payment_supports_manual_payment_date(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    creditor = _get_current_user(client, normal_user_token_headers)
    debtor_email, debtor_id = _add_member_directly(db, group_id)

    expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Supermercado",
            "amount": 100,
            "payer_id": creditor["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert expense_response.status_code == 200

    debtor_headers = authentication_token_from_email(
        client=client, email=debtor_email, db=db
    )

    payment_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=debtor_headers,
        json={
            "from_user_id": str(debtor_id),
            "to_user_id": creditor["id"],
            "amount": 20,
            "payment_date": "2026-04-10",
        },
    )
    assert payment_response.status_code == 200
    payment = payment_response.json()
    assert payment["created_at"].startswith("2026-04-10T12:00:00")

    group_detail_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}", headers=debtor_headers
    )
    assert group_detail_response.status_code == 200
    assert group_detail_response.json()["settlement_payments"][0][
        "created_at"
    ].startswith("2026-04-10T12:00:00")


def test_create_settlement_payment_validates_relation_amount_and_actor(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    owner = _get_current_user(client, normal_user_token_headers)

    second_user_email, second_user_id = _add_member_directly(db, group_id)
    third_user = create_random_user(db)
    fourth_user = create_random_user(db)
    db.add(
        GroupMember(
            user_id=third_user.id,
            group_id=group_id,
            is_admin=False,
            balance=0.0,
        )
    )
    db.add(
        GroupMember(
            user_id=fourth_user.id,
            group_id=group_id,
            is_admin=False,
            balance=0.0,
        )
    )
    db.commit()

    owner_member = db.get(GroupMember, (uuid.UUID(owner["id"]), group_id))
    second_member = db.get(GroupMember, (second_user_id, group_id))
    third_member = db.get(GroupMember, (third_user.id, group_id))
    fourth_member = db.get(GroupMember, (fourth_user.id, group_id))
    assert owner_member and second_member and third_member and fourth_member

    owner_member.balance = 10.0
    second_member.balance = -20.0
    third_member.balance = -30.0
    fourth_member.balance = 40.0
    db.add(owner_member)
    db.add(second_member)
    db.add(third_member)
    db.add(fourth_member)
    db.commit()

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )
    third_user_headers = authentication_token_from_email(
        client=client, email=third_user.email, db=db
    )

    forbidden_actor_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=normal_user_token_headers,
        json={
            "from_user_id": str(second_user_id),
            "to_user_id": owner["id"],
            "amount": 5,
        },
    )
    assert forbidden_actor_response.status_code == 403
    assert forbidden_actor_response.json()["detail"] == (
        "You can only register payments for your own debt"
    )

    exceeds_pending_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=second_user_headers,
        json={
            "from_user_id": str(second_user_id),
            "to_user_id": str(fourth_user.id),
            "amount": 21,
        },
    )
    assert exceeds_pending_response.status_code == 400
    assert exceeds_pending_response.json()["detail"] == (
        "Payment amount exceeds the sender's pending debt"
    )

    valid_non_suggested_relation_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=third_user_headers,
        json={
            "from_user_id": str(third_user.id),
            "to_user_id": owner["id"],
            "amount": 5.126,
        },
    )
    assert valid_non_suggested_relation_response.status_code == 200
    assert valid_non_suggested_relation_response.json()["amount"] == 5.13

    exceeds_receiver_credit_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=third_user_headers,
        json={
            "from_user_id": str(third_user.id),
            "to_user_id": owner["id"],
            "amount": 5,
        },
    )
    assert exceeds_receiver_credit_response.status_code == 400
    assert exceeds_receiver_credit_response.json()["detail"] == (
        "Payment amount exceeds the receiver's pending credit"
    )

    sender_not_debtor_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=normal_user_token_headers,
        json={
            "from_user_id": owner["id"],
            "to_user_id": str(fourth_user.id),
            "amount": 5,
        },
    )
    assert sender_not_debtor_response.status_code == 400
    assert sender_not_debtor_response.json()["detail"] == (
        "Sender must have an outstanding debt"
    )

    receiver_not_creditor_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=second_user_headers,
        json={
            "from_user_id": str(second_user_id),
            "to_user_id": str(third_user.id),
            "amount": 5,
        },
    )
    assert receiver_not_creditor_response.status_code == 400
    assert receiver_not_creditor_response.json()["detail"] == (
        "Receiver must have an outstanding credit"
    )

    rounds_to_zero_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
        headers=second_user_headers,
        json={
            "from_user_id": str(second_user_id),
            "to_user_id": str(fourth_user.id),
            "amount": 0.004,
        },
    )
    assert rounds_to_zero_response.status_code == 400
    assert rounds_to_zero_response.json()["detail"] == (
        "Payment amount must be at least 0.01 after rounding"
    )


def test_create_settlement_payment_returns_generic_500_and_logs_exception(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
    monkeypatch: Any,
    caplog: Any,
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    creditor = _get_current_user(client, normal_user_token_headers)
    debtor_email, debtor_id = _add_member_directly(db, group_id)

    creditor_member = db.get(GroupMember, (uuid.UUID(creditor["id"]), group_id))
    debtor_member = db.get(GroupMember, (debtor_id, group_id))
    assert creditor_member and debtor_member

    creditor_member.balance = 10.0
    debtor_member.balance = -10.0
    db.add(creditor_member)
    db.add(debtor_member)
    db.commit()

    debtor_headers = authentication_token_from_email(
        client=client, email=debtor_email, db=db
    )

    def failing_commit(_self: Session) -> None:
        raise RuntimeError("boom settlement commit")

    monkeypatch.setattr(Session, "commit", failing_commit)

    with caplog.at_level("ERROR", logger="app.api.routes.groups"):
        response = client.post(
            f"{settings.API_V1_STR}/groups/{group['id']}/settlement-payments",
            headers=debtor_headers,
            json={
                "from_user_id": str(debtor_id),
                "to_user_id": creditor["id"],
                "amount": 5,
            },
        )

    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error"
    assert "boom settlement commit" not in response.text
    assert "boom settlement commit" in caplog.text


def test_create_expense_rejects_invalid_members_and_custom_participants(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    payer = _get_current_user(client, normal_user_token_headers)
    second_user_email, second_user_id = _add_member_directly(db, group_id)
    outsider = create_random_user(db)
    outsider_headers = authentication_token_from_email(
        client=client, email=outsider.email, db=db
    )

    non_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=outsider_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": payer["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert non_member_response.status_code == 403

    payer_not_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": str(outsider.id),
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert payer_not_member_response.status_code == 400
    assert payer_not_member_response.json()["detail"] == (
        "Payer is not a member of this group"
    )

    missing_participants_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": payer["id"],
            "division_mode": "custom",
            "participants": [],
        },
    )
    assert missing_participants_response.status_code == 400
    assert missing_participants_response.json()["detail"] == (
        "Custom division requires participants"
    )

    duplicate_participants_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": payer["id"],
            "division_mode": "custom",
            "participants": [
                {"user_id": str(second_user_id), "amount": 10},
                {"user_id": str(second_user_id), "amount": 10},
            ],
        },
    )
    assert duplicate_participants_response.status_code == 400
    assert duplicate_participants_response.json()["detail"] == (
        "Participants must be unique"
    )

    participant_not_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": payer["id"],
            "division_mode": "custom",
            "participants": [
                {"user_id": payer["id"], "amount": 10},
                {"user_id": str(outsider.id), "amount": 10},
            ],
        },
    )
    assert participant_not_member_response.status_code == 400
    assert participant_not_member_response.json()["detail"] == (
        "One or more participants are not members of this group"
    )

    missing_amount_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": payer["id"],
            "division_mode": "custom",
            "participants": [{"user_id": str(second_user_id)}],
        },
    )
    assert missing_amount_response.status_code == 400
    assert "must be a positive number" in missing_amount_response.json()["detail"]

    sum_mismatch_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Taxi",
            "amount": 20,
            "payer_id": payer["id"],
            "division_mode": "custom",
            "participants": [
                {"user_id": payer["id"], "amount": 5},
                {"user_id": str(second_user_id), "amount": 5},
            ],
        },
    )
    assert sum_mismatch_response.status_code == 400
    assert sum_mismatch_response.json()["detail"] == (
        "Sum of custom amounts does not match the total expense amount"
    )

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )
    second_user_group_response = client.get(
        f"{settings.API_V1_STR}/groups/{group['id']}",
        headers=second_user_headers,
    )
    assert second_user_group_response.status_code == 200


def test_update_expense_recalculates_balances(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    owner = _get_current_user(client, normal_user_token_headers)

    second_user_email, second_user_id = _add_member_directly(db, group_id)
    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )

    create_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Cena",
            "amount": 100,
            "payer_id": owner["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert create_response.status_code == 200
    expense = create_response.json()

    update_response = client.patch(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses/{expense['id']}",
        headers=normal_user_token_headers,
        json={
            "description": "Cena actualizada",
            "amount": 120,
            "payer_id": owner["id"],
            "division_mode": "custom",
            "participants": [
                {"user_id": owner["id"], "amount": 20},
                {"user_id": str(second_user_id), "amount": 100},
            ],
        },
    )
    assert update_response.status_code == 200
    updated_expense = update_response.json()
    assert updated_expense["description"] == "Cena actualizada"
    assert sorted(
        participant["amount_owed"] for participant in updated_expense["participants"]
    ) == [20.0, 100.0]

    owner_groups = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
    )
    assert owner_groups.status_code == 200
    owner_group = next(
        item for item in owner_groups.json()["data"] if item["id"] == group["id"]
    )
    assert owner_group["current_user_balance"] == 100.0

    second_user_groups = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=second_user_headers,
    )
    assert second_user_groups.status_code == 200
    second_group = next(
        item
        for item in second_user_groups.json()["data"]
        if item["id"] == group["id"]
    )
    assert second_group["current_user_balance"] == -100.0


def test_delete_expense_reverts_balances(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    owner = _get_current_user(client, normal_user_token_headers)

    second_user_email, _ = _add_member_directly(db, group_id)
    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )

    create_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Super",
            "amount": 100,
            "payer_id": owner["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert create_response.status_code == 200
    expense_id = create_response.json()["id"]

    delete_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses/{expense_id}",
        headers=normal_user_token_headers,
    )
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Expense deleted successfully"

    owner_groups = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=normal_user_token_headers,
    )
    assert owner_groups.status_code == 200
    owner_group = next(
        item for item in owner_groups.json()["data"] if item["id"] == group["id"]
    )
    assert owner_group["current_user_balance"] == 0.0

    second_user_groups = client.get(
        f"{settings.API_V1_STR}/groups/",
        headers=second_user_headers,
    )
    assert second_user_groups.status_code == 200
    second_group = next(
        item
        for item in second_user_groups.json()["data"]
        if item["id"] == group["id"]
    )
    assert second_group["current_user_balance"] == 0.0


def test_update_and_delete_expense_require_payer_or_admin(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    group_id = uuid.UUID(group["id"])
    owner = _get_current_user(client, normal_user_token_headers)

    second_user_email, _ = _add_member_directly(db, group_id)
    second_user_headers = authentication_token_from_email(
        client=client, email=second_user_email, db=db
    )

    create_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=normal_user_token_headers,
        json={
            "description": "Internet",
            "amount": 100,
            "payer_id": owner["id"],
            "division_mode": "equitable",
            "participants": [],
        },
    )
    assert create_response.status_code == 200
    expense_id = create_response.json()["id"]

    unauthorized_update_response = client.patch(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses/{expense_id}",
        headers=second_user_headers,
        json={"description": "Internet 2"},
    )
    assert unauthorized_update_response.status_code == 403

    unauthorized_delete_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses/{expense_id}",
        headers=second_user_headers,
    )
    assert unauthorized_delete_response.status_code == 403


def test_delete_expense_with_removed_historical_member_succeeds(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    second_user = create_random_user(db)

    add_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=normal_user_token_headers,
        json={"email": second_user.email, "is_admin": False},
    )
    assert add_member_response.status_code == 200

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user.email, db=db
    )

    # Expense with only second user as participant keeps balances at zero,
    # allowing member removal while preserving historical references.
    create_expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=second_user_headers,
        json={
            "description": "Gasto historico",
            "amount": 100,
            "payer_id": str(second_user.id),
            "division_mode": "custom",
            "participants": [
                {"user_id": str(second_user.id), "amount": 100},
            ],
        },
    )
    assert create_expense_response.status_code == 200
    expense_id = create_expense_response.json()["id"]

    remove_member_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/members/{second_user.id}",
        headers=normal_user_token_headers,
    )
    assert remove_member_response.status_code == 200

    delete_expense_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses/{expense_id}",
        headers=normal_user_token_headers,
    )
    assert delete_expense_response.status_code == 200
    assert delete_expense_response.json()["message"] == "Expense deleted successfully"


def test_update_expense_with_removed_historical_member_succeeds(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    group = _create_group(client, normal_user_token_headers)
    second_user = create_random_user(db)

    add_member_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/members",
        headers=normal_user_token_headers,
        json={"email": second_user.email, "is_admin": False},
    )
    assert add_member_response.status_code == 200

    second_user_headers = authentication_token_from_email(
        client=client, email=second_user.email, db=db
    )

    create_expense_response = client.post(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses",
        headers=second_user_headers,
        json={
            "description": "Gasto historico",
            "amount": 100,
            "payer_id": str(second_user.id),
            "division_mode": "custom",
            "participants": [
                {"user_id": str(second_user.id), "amount": 100},
            ],
        },
    )
    assert create_expense_response.status_code == 200
    expense_id = create_expense_response.json()["id"]

    remove_member_response = client.delete(
        f"{settings.API_V1_STR}/groups/{group['id']}/members/{second_user.id}",
        headers=normal_user_token_headers,
    )
    assert remove_member_response.status_code == 200

    update_expense_response = client.patch(
        f"{settings.API_V1_STR}/groups/{group['id']}/expenses/{expense_id}",
        headers=normal_user_token_headers,
        json={
            "description": "Gasto historico editado",
            "amount": 120,
        },
    )
    assert update_expense_response.status_code == 200
    assert update_expense_response.json()["description"] == "Gasto historico editado"
    assert update_expense_response.json()["amount"] == 120
