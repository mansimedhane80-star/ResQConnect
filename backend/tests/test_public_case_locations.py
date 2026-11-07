import sys
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.geocoding import coordinate_cache_key
from app.models import GeocodeCache, SOSCase
from app.routes.cases import get_public_completed_cases


class FakeQuery:
    def __init__(self, model, db):
        self.model = model
        self.db = db
        self.resolved_filter_applied = False

    def filter(self, *criteria):
        if self.model is SOSCase:
            self.resolved_filter_applied = True
        return self

    def order_by(self, *_criteria):
        return self

    def limit(self, _limit):
        return self

    def all(self):
        if self.model is SOSCase:
            if not self.resolved_filter_applied:
                raise AssertionError("Public case query must filter resolved cases")
            return [case for case in self.db.cases if case.case_status in {"resolved", "completed"}]
        return self.db.geocodes


class FakeSession:
    def __init__(self, cases, geocodes):
        self.cases = cases
        self.geocodes = geocodes

    def query(self, model):
        return FakeQuery(model, self)


def make_case(case_id, status, latitude, longitude):
    return SimpleNamespace(
        case_id=case_id,
        case_status=status,
        latitude=latitude,
        longitude=longitude,
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 2),
        disaster_type="flood",
        message="Private citizen description with a phone number",
        contact_number="+911234567890",
    )


class PublicCaseLocationTests(unittest.TestCase):
    def test_missing_geocode_returns_null_city_and_state(self):
        case = make_case(1, "resolved", 12.3, 45.6)
        result = get_public_completed_cases(FakeSession([case], []))
        self.assertEqual(result[0]["city"], None)
        self.assertEqual(result[0]["state"], None)

    def test_public_result_contains_only_coarse_location_and_no_private_fields(self):
        case = make_case(1, "resolved", 12.3, 45.6)
        cached_address = {
            "city": "Sample City",
            "state": "Sample State",
            "house_number": "12",
            "road": "Private Road",
            "postal_code": "12345",
            "attribution": "© OpenStreetMap contributors",
        }
        cache = SimpleNamespace(
            cache_key=coordinate_cache_key(case.latitude, case.longitude),
            address=cached_address,
        )
        result = get_public_completed_cases(FakeSession([case], [cache]))

        self.assertEqual(result[0]["city"], "Sample City")
        self.assertEqual(result[0]["state"], "Sample State")
        self.assertEqual(set(result[0]), {
            "city", "state", "reported_at", "disaster_type", "description",
            "status", "location_attribution",
        })
        self.assertNotIn("Private Road", str(result))
        self.assertNotIn("12345", str(result))
        self.assertNotIn("+911234567890", str(result))
        self.assertNotIn("Private citizen description", str(result))

    def test_only_resolved_cases_are_returned(self):
        cases = [
            make_case(1, "resolved", 12.3, 45.6),
            make_case(2, "completed", 12.4, 45.7),
            make_case(3, "in_progress", 12.5, 45.8),
        ]
        result = get_public_completed_cases(FakeSession(cases, []))
        self.assertEqual(len(result), 2)
        self.assertTrue(all(row["status"] == "Resolved" for row in result))


if __name__ == "__main__":
    unittest.main()
