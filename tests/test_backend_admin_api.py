import json
import time
import unittest
from datetime import date, datetime
from types import SimpleNamespace

import jwt

from backend.app import ApiApp
from backend.pagination import InvalidCursorError

SECRET = "unit-test-secret"


def make_token(**claims) -> str:
    payload = {
        "sub": "user-1",
        "aud": "espeleo-api",
        "iss": "espeleo-test",
        "exp": int(time.time()) + 3600,
        **claims,
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def auth(**claims) -> dict:
    return {"Authorization": f"Bearer {make_token(**claims)}"}


def make_member(member_id=1, club_id=1, **overrides):
    values = dict(
        member_id=member_id,
        status="active",
        title_prefix="Ing.",
        first_name="Jana",
        last_name="Kovacova",
        title_suffix="",
        email="jana@example.sk",
        phone="0900",
        primary_club_id=club_id,
        primary_club_name="Alpha",
        is_president=False,
        has_paid_current_year_fee=True,
        discounted_membership=False,
        street="Hlavna 1",
        city="Kosice",
        zip_code="04001",
        country="SK",
        portrait_url=None,
        has_ecp=True,
        ecp_valid_until=date(2027, 6, 30),
        is_directory_stub=False,
    )
    values.update(overrides)
    return SimpleNamespace(**values)


class AdminRepository:
    def __init__(self):
        self.member_calls = []
        self.members = {1: make_member(1, 1), 2: make_member(2, 2, first_name="Peter")}
        self.belongs = {(1, 1), (2, 2)}
        self.ecp_calls = []
        self.notification_calls = 0

    def list_members(self, limit, cursor=None, filter_text="", club_ids=None, status=None, paid=None):
        if cursor == "corrupted-cursor":
            raise InvalidCursorError("bad")
        self.member_calls.append(
            dict(limit=limit, cursor=cursor, filter_text=filter_text, club_ids=club_ids, status=status, paid=paid)
        )
        items = [
            m for m in self.members.values()
            if club_ids is None or m.primary_club_id in club_ids
        ]
        return items[:limit], ("next" if len(items) > limit else None)

    def fetch_member_detail(self, member_id):
        return self.members.get(member_id)

    def member_belongs_to_any_club(self, member_id, club_ids):
        return any((member_id, club_id) in self.belongs for club_id in club_ids)

    def fetch_dashboard_stats(self):
        return {
            "member_count": 25,
            "club_count": 8,
            "paid_member_count": 20,
            "pending_ecp_request_count": 3,
            "members_per_club": [{"club_id": 1, "name": "Alpha", "member_count": 7, "paid_member_count": 5}],
            "year": 2026,
        }

    def list_ecp_requests(self, limit, cursor=None, status=None):
        self.ecp_calls.append(dict(limit=limit, cursor=cursor, status=status))
        row = dict(
            request_id=5,
            member_id=1,
            status="pending",
            request_date=date(2026, 11, 1),
            first_name="Jana",
            last_name="Kovacova",
            title_prefix="Ing.",
            title_suffix="",
            primary_club_name="Alpha",
            photo_hash="must-not-leak",
        )
        return [row], None

    def list_notifications(self):
        self.notification_calls += 1
        return [
            dict(
                notification_id=9,
                created_at=datetime(2026, 11, 2, 10, 0),
                text="Hello",
                valid_from=datetime(2026, 11, 2, 10, 0),
                valid_to=datetime(2026, 12, 2, 10, 0),
                status="pending",
            )
        ]


def make_app(repository=None):
    return ApiApp(repository=repository or AdminRepository(), jwt_secret=SECRET)


def get(app, path, query=None, **claims):
    return app.handle_request("GET", path, headers=auth(**claims), query=query or {})


class MembersListTest(unittest.TestCase):
    def test_requires_bearer_token(self):
        response = make_app().handle_request("GET", "/api/v1/members", headers={})
        self.assertEqual(response.status_code, 401)

    def test_member_role_is_forbidden(self):
        response = get(make_app(), "/api/v1/members", roles=["member"], member_id=1)
        self.assertEqual(response.status_code, 403)

    def test_admin_lists_all_members_with_filters(self):
        app = make_app()
        response = get(
            app, "/api/v1/members",
            {"limit": "10", "q": "jana", "status": "active", "paid": "true", "clubId": "1"},
            roles=["admin"],
        )
        self.assertEqual(response.status_code, 200)
        body = json.loads(response.body)
        self.assertEqual(body["items"][0]["firstName"], "Jana")
        self.assertEqual(body["items"][0]["primaryClubName"], "Alpha")
        self.assertEqual(body["items"][0]["hasPaidCurrentYearFee"], True)
        self.assertEqual(
            app.repository.member_calls[-1],
            dict(limit=10, cursor=None, filter_text="jana", club_ids={1}, status="active", paid=True),
        )

    def test_admin_without_club_filter_is_unscoped(self):
        app = make_app()
        get(app, "/api/v1/members", roles=["admin"])
        self.assertIsNone(app.repository.member_calls[-1]["club_ids"])

    def test_president_is_scoped_to_own_clubs(self):
        app = make_app()
        response = get(app, "/api/v1/members", roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(app.repository.member_calls[-1]["club_ids"], {1})

    def test_president_cannot_request_foreign_club(self):
        response = get(make_app(), "/api/v1/members", {"clubId": "2"}, roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 403)

    def test_president_without_clubs_gets_empty_scope(self):
        app = make_app()
        response = get(app, "/api/v1/members", roles=["club_president"], club_ids=[])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(app.repository.member_calls[-1]["club_ids"], set())

    def test_rejects_invalid_filters(self):
        app = make_app()
        for query in ({"status": "bogus"}, {"paid": "maybe"}, {"clubId": "abc"}):
            response = get(app, "/api/v1/members", query, roles=["admin"])
            self.assertEqual(response.status_code, 422, query)
        self.assertEqual(app.repository.member_calls, [])

    def test_corrupted_cursor_is_400(self):
        response = get(make_app(), "/api/v1/members", {"cursor": "corrupted-cursor"}, roles=["admin"])
        self.assertEqual(response.status_code, 400)

    def test_response_never_leaks_internal_fields(self):
        response = get(make_app(), "/api/v1/members", roles=["admin"])
        item = json.loads(response.body)["items"][0]
        for forbidden in ("ecpHash", "ecp_hash", "birthDate", "portraitHash"):
            self.assertNotIn(forbidden, item)


class ClubSerializationTest(unittest.TestCase):
    def test_club_exposes_foundation_date_as_iso(self):
        from backend.serializers import club_to_api

        club = SimpleNamespace(club_id=1, name="Alpha", foundation_date=date(1980, 1, 2), member_count=3)
        self.assertEqual(club_to_api(club)["foundationDate"], "1980-01-02")

    def test_club_without_foundation_date_is_null(self):
        from backend.serializers import club_to_api

        self.assertIsNone(club_to_api(SimpleNamespace(club_id=1, name="Alpha"))["foundationDate"])


class MemberDetailTest(unittest.TestCase):
    def test_admin_gets_detail_with_address(self):
        response = get(make_app(), "/api/v1/members/1", roles=["admin"])
        self.assertEqual(response.status_code, 200)
        body = json.loads(response.body)
        self.assertEqual(body["address"], {"street": "Hlavna 1", "city": "Kosice", "zipCode": "04001", "country": "SK"})
        self.assertEqual(body["ecpValidUntil"], "2027-06-30")

    def test_unknown_member_is_404(self):
        response = get(make_app(), "/api/v1/members/999", roles=["admin"])
        self.assertEqual(response.status_code, 404)

    def test_president_cannot_read_foreign_member(self):
        response = get(make_app(), "/api/v1/members/2", roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 403)

    def test_president_can_read_own_member(self):
        response = get(make_app(), "/api/v1/members/1", roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 200)

    def test_non_numeric_member_id_is_404(self):
        response = get(make_app(), "/api/v1/members/abc", roles=["admin"])
        self.assertEqual(response.status_code, 404)


class StatsTest(unittest.TestCase):
    def test_admin_gets_stats(self):
        response = get(make_app(), "/api/v1/stats", roles=["admin"])
        self.assertEqual(response.status_code, 200)
        body = json.loads(response.body)
        self.assertEqual(body["memberCount"], 25)
        self.assertEqual(body["unpaidMemberCount"], 5)
        self.assertEqual(
            body["membersPerClub"],
            [{"id": 1, "name": "Alpha", "memberCount": 7, "paidMemberCount": 5}],
        )

    def test_president_is_forbidden(self):
        response = get(make_app(), "/api/v1/stats", roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 403)


class EcpRequestsListTest(unittest.TestCase):
    def test_admin_lists_requests_without_photo_hash(self):
        app = make_app()
        response = get(app, "/api/v1/ecp-requests", {"status": "pending"}, roles=["admin"])
        self.assertEqual(response.status_code, 200)
        item = json.loads(response.body)["items"][0]
        self.assertEqual(item["memberName"], "Ing. Jana Kovacova")
        self.assertEqual(item["requestDate"], "2026-11-01")
        self.assertNotIn("photoHash", item)
        self.assertNotIn("must-not-leak", response.body)
        self.assertEqual(app.repository.ecp_calls[-1]["status"], "pending")

    def test_invalid_status_is_422(self):
        response = get(make_app(), "/api/v1/ecp-requests", {"status": "x"}, roles=["admin"])
        self.assertEqual(response.status_code, 422)

    def test_president_is_forbidden(self):
        response = get(make_app(), "/api/v1/ecp-requests", roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 403)


class NotificationsTest(unittest.TestCase):
    def test_admin_lists_notifications(self):
        response = get(make_app(), "/api/v1/notifications", roles=["admin"])
        self.assertEqual(response.status_code, 200)
        item = json.loads(response.body)["items"][0]
        self.assertEqual(item["id"], 9)
        self.assertEqual(item["validTo"], "2026-12-02T10:00:00")

    def test_president_is_forbidden(self):
        response = get(make_app(), "/api/v1/notifications", roles=["club_president"], club_ids=[1])
        self.assertEqual(response.status_code, 403)


class AuditRouteTemplateTest(unittest.TestCase):
    def test_new_routes_are_audited_with_templates_not_raw_ids(self):
        events = []
        sink = SimpleNamespace(record_api_audit_event=events.append)
        app = ApiApp(repository=AdminRepository(), jwt_secret=SECRET, audit_sink=sink)
        app.handle_request("GET", "/api/v1/members/1", headers=auth(roles=["admin"]))
        app.handle_request("GET", "/api/v1/stats", headers=auth(roles=["admin"]))
        self.assertEqual([e.route for e in events], ["/api/v1/members/{member_id}", "/api/v1/stats"])


if __name__ == "__main__":
    unittest.main()
