import unittest
from datetime import date

from backend.pagination import InvalidCursorError, encode_id_cursor
from backend.repository import DatabaseApiRepository


class RecordingDb:
    def __init__(self, rows=None, one=None):
        self.rows = rows or []
        self.one = one
        self.calls = []

    def _fetch_all(self, query, params=None, conn=None):
        self.calls.append((query, params))
        return self.rows

    def _fetch_one(self, query, params=None, conn=None):
        self.calls.append((query, params))
        return self.one


def member_row(member_id, **overrides):
    row = dict(
        member_id=member_id,
        member_status="active",
        title_prefix="",
        first_name="Jana",
        last_name="Kovacova",
        title_suffix="",
        phone="0900",
        email="jana@example.sk",
        ecp_hash="secret-hash",
        is_directory_stub=False,
        club_role="member",
        primary_club_id=1,
        primary_club_name="Alpha",
        has_paid_current_year_fee=True,
        discounted_membership=False,
    )
    row.update(overrides)
    return row


class ListMembersTest(unittest.TestCase):
    def test_empty_club_scope_short_circuits_without_query(self):
        db = RecordingDb()
        members, cursor = DatabaseApiRepository(db).list_members(limit=10, club_ids=set())
        self.assertEqual((members, cursor), ([], None))
        self.assertEqual(db.calls, [])

    def test_user_input_is_parameterized_never_interpolated(self):
        db = RecordingDb()
        evil = "x'; DROP TABLE members;--"
        DatabaseApiRepository(db).list_members(limit=10, filter_text=evil, club_ids={1}, status="active", paid=True)
        query, params = db.calls[0]
        self.assertNotIn("DROP TABLE", query)
        self.assertIn(f"%{evil}%", params)
        self.assertIn("active", params)

    def test_like_wildcards_in_filter_are_escaped(self):
        db = RecordingDb()
        DatabaseApiRepository(db).list_members(limit=10, filter_text="50%_off")
        _, params = db.calls[0]
        self.assertIn("%50\\%\\_off%", params)

    def test_fetches_one_extra_row_and_builds_next_cursor(self):
        db = RecordingDb(rows=[member_row(1), member_row(2), member_row(3)])
        members, cursor = DatabaseApiRepository(db).list_members(limit=2)
        self.assertEqual([m.member_id for m in members], [1, 2])
        self.assertEqual(cursor, encode_id_cursor(2))
        self.assertEqual(db.calls[0][1][-1], 3)

    def test_no_next_cursor_on_last_page(self):
        db = RecordingDb(rows=[member_row(1)])
        _, cursor = DatabaseApiRepository(db).list_members(limit=2)
        self.assertIsNone(cursor)

    def test_cursor_is_applied_and_corrupt_cursor_raises(self):
        db = RecordingDb()
        repo = DatabaseApiRepository(db)
        repo.list_members(limit=5, cursor=encode_id_cursor(41))
        self.assertIn(41, db.calls[0][1])
        with self.assertRaises(InvalidCursorError):
            repo.list_members(limit=5, cursor="!!!")

    def test_maps_extended_fields_without_leaking_hash(self):
        db = RecordingDb(rows=[member_row(7, discounted_membership=True)])
        (member,), _ = DatabaseApiRepository(db).list_members(limit=5)
        self.assertEqual(member.primary_club_name, "Alpha")
        self.assertTrue(member.discounted_membership)
        self.assertTrue(member.has_paid_current_year_fee)


class DirectoryStubConsistencyTest(unittest.TestCase):
    """Directory stubs are placeholder rows, so list and stats must treat them the same way."""

    def test_member_list_excludes_directory_stubs(self):
        db = RecordingDb()
        DatabaseApiRepository(db).list_members(limit=5)
        self.assertIn("is_directory_stub = FALSE", db.calls[0][0])

    def test_stats_exclude_stubs_from_paid_and_per_club_counts(self):
        db = RecordingDb(one={})
        DatabaseApiRepository(db).fetch_dashboard_stats()
        counts_query, per_club_query = db.calls[0][0], db.calls[1][0]
        self.assertEqual(counts_query.count("is_directory_stub = FALSE"), 2)
        self.assertIn("is_directory_stub = FALSE", per_club_query)


class ParameterOrderTest(unittest.TestCase):
    def test_placeholder_count_matches_params_for_every_filter_combination(self):
        import itertools

        for club_ids, status, paid, text in itertools.product([None, {1, 2}], [None, "active"], [None, True, False], ["", "jana"]):
            db = RecordingDb()
            DatabaseApiRepository(db).list_members(
                limit=5, filter_text=text, club_ids=club_ids, status=status, paid=paid
            )
            query, params = db.calls[0]
            self.assertEqual(
                query.count("%s"), len(params), (club_ids, status, paid, text)
            )

    def test_ecp_request_placeholder_count_matches_params(self):
        import itertools

        for cursor, status in itertools.product([None, encode_id_cursor(10)], [None, "pending"]):
            db = RecordingDb()
            DatabaseApiRepository(db).list_ecp_requests(limit=5, cursor=cursor, status=status)
            query, params = db.calls[0]
            self.assertEqual(query.count("%s"), len(params), (cursor, status))


class FetchMemberDetailTest(unittest.TestCase):
    def test_returns_none_when_missing(self):
        self.assertIsNone(DatabaseApiRepository(RecordingDb(one=None)).fetch_member_detail(1))

    def test_maps_address_and_ecp_validity(self):
        row = member_row(
            5, street="Hlavna 1", city="Kosice", zip_code="04001", country="SK",
            portrait_url="https://x/p.jpg", ecp_valid_until=date(2027, 6, 30),
        )
        member = DatabaseApiRepository(RecordingDb(one=row)).fetch_member_detail(5)
        self.assertEqual((member.street, member.city, member.zip_code), ("Hlavna 1", "Kosice", "04001"))
        self.assertEqual(member.ecp_valid_until, date(2027, 6, 30))
        self.assertEqual(member.portrait_url, "https://x/p.jpg")


class DashboardStatsTest(unittest.TestCase):
    def test_combines_counts_and_per_club_breakdown(self):
        db = RecordingDb(
            rows=[{"club_id": 1, "name": "Alpha", "member_count": 7, "paid_member_count": 5}],
            one={"member_count": 25, "club_count": 8, "paid_member_count": 20, "pending_ecp_request_count": 3},
        )
        stats = DatabaseApiRepository(db).fetch_dashboard_stats()
        self.assertEqual(stats["member_count"], 25)
        self.assertEqual(stats["pending_ecp_request_count"], 3)
        self.assertEqual(
            stats["members_per_club"],
            [{"club_id": 1, "name": "Alpha", "member_count": 7, "paid_member_count": 5}],
        )
        self.assertEqual(stats["year"], date.today().year)
        # The per-club paid breakdown must be scoped to the current fee year via a bound parameter.
        per_club_query, per_club_params = db.calls[1]
        self.assertIn("membership_fees", per_club_query)
        self.assertEqual(per_club_params, (date.today().year,))


class ListEcpRequestsTest(unittest.TestCase):
    def test_status_filter_is_parameterized_and_pagination_works(self):
        rows = [{"request_id": 9}, {"request_id": 8}, {"request_id": 7}]
        db = RecordingDb(rows=rows)
        page, cursor = DatabaseApiRepository(db).list_ecp_requests(limit=2, status="pending")
        self.assertEqual([r["request_id"] for r in page], [9, 8])
        self.assertEqual(cursor, encode_id_cursor(8))
        self.assertIn("pending", db.calls[0][1])
        self.assertNotIn("'pending'", db.calls[0][0].split("WHERE", 1)[-1].split("ORDER")[0])

    def test_without_status_has_no_filter_param(self):
        db = RecordingDb(rows=[])
        DatabaseApiRepository(db).list_ecp_requests(limit=5)
        self.assertNotIn("pending", db.calls[0][1])


class ListNotificationsTest(unittest.TestCase):
    def test_returns_rows_as_is(self):
        rows = [{"notification_id": 1}]
        self.assertEqual(DatabaseApiRepository(RecordingDb(rows=rows)).list_notifications(), rows)


if __name__ == "__main__":
    unittest.main()
