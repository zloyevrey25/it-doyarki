"""Тесты itinerary-модели оптимизатора."""

import unittest
from collections import defaultdict
from copy import deepcopy

from backend.main import compare_routes
from backend.optimizer import optimize_shipments
from backend.schemas import CompareRoutesRequest, OptimizeRequest


def scenario(*, far_lon=1.0, capacity=20, stock=20, max_time=10):
    return {
        "farm_location": "farm",
        "farm_coordinates": [0.0, 0.0],
        "products": ["berry"],
        "buyers": ["near", "far"],
        "stock": {"berry": stock},
        "demand": {"berry": {"near": 10, "far": 10}},
        "prices": {"berry": {"near": 100, "far": 100}},
        "vehicles": {
            "truck": {
                "capacity": capacity, "cost": 30, "available": True,
                "speed_kmh": 70, "cost_per_km": 1, "route_base_cost": 10,
                "refrigeration_hours": 0, "model": "Truck", "plate_number": "A1",
            }
        },
        "max_delivery_time": {"berry": max_time},
        "buyer_info": {
            "near": {"name": "Near", "city": "Near", "distance_km": 66, "coordinates": [0.0, 0.5]},
            "far": {"name": "Far", "city": "Far", "distance_km": 131, "coordinates": [0.0, far_lon]},
        },
    }


class OptimizerTest(unittest.TestCase):
    def assert_consistent(self, data, result):
        by_product, by_demand, by_vehicle = defaultdict(float), defaultdict(float), defaultdict(float)
        itinerary_ids = {item["id"] for item in result["itineraries"]}
        self.assertEqual(len({item["vehicle"] for item in result["itineraries"]}), len(result["itineraries"]))
        for row in result["shipments"]:
            self.assertIn(row["itinerary_id"], itinerary_ids)
            self.assertLessEqual(row["arrival_time"], data["max_delivery_time"][row["product"]] + data["vehicles"][row["vehicle"]].get("refrigeration_hours", 0) + 1e-6)
            by_product[row["product"]] += row["quantity"]
            by_demand[(row["product"], row["buyer"])] += row["quantity"]
            by_vehicle[row["vehicle"]] += row["quantity"]
        for product in data["products"]:
            self.assertLessEqual(by_product[product], data["stock"][product] + 1e-6)
            self.assertAlmostEqual(result["leftovers"][product], data["stock"][product] - by_product[product])
            for buyer in data["buyers"]:
                self.assertLessEqual(by_demand[(product, buyer)], data["demand"][product][buyer] + 1e-6)
        for vehicle, definition in data["vehicles"].items():
            self.assertLessEqual(by_vehicle[vehicle], definition["capacity"] + 1e-6)
            if not definition["available"]:
                self.assertEqual(by_vehicle[vehicle], 0)
        expected_revenue = sum(row["quantity"] * data["prices"][row["product"]][row["buyer"]] for row in result["shipments"])
        expected_cost = sum(item["itinerary_cost"] + item["fixed_vehicle_cost"] for item in result["itineraries"])
        self.assertAlmostEqual(result["revenue"], expected_revenue)
        self.assertAlmostEqual(result["transport_cost"], expected_cost)
        self.assertAlmostEqual(result["profit"], expected_revenue - expected_cost)

    def test_one_vehicle_chooses_at_most_one_itinerary(self):
        result = optimize_shipments(scenario())
        self.assertLessEqual(len(result["itineraries"]), 1)
        self.assert_consistent(scenario(), result)

    def test_direct_itinerary(self):
        data = scenario()
        data["buyers"] = ["near"]
        data["demand"]["berry"] = {"near": 10}
        data["prices"]["berry"] = {"near": 100}
        data["buyer_info"] = {"near": data["buyer_info"]["near"]}
        result = optimize_shipments(data)
        self.assertEqual([stop["buyer"] for stop in result["itineraries"][0]["ordered_stops"]], ["near"])

    def test_allowed_pair_itinerary_and_stop_order(self):
        result = optimize_shipments(scenario())
        itinerary = result["itineraries"][0]
        self.assertTrue(itinerary["id"].startswith("pair__"))
        self.assertEqual([stop["buyer"] for stop in itinerary["ordered_stops"]], ["near", "far"])
        self.assertLess(itinerary["ordered_stops"][0]["distance_km"], itinerary["ordered_stops"][1]["distance_km"])

    def test_pair_order_starts_with_buyer_closer_to_farm(self):
        stops = optimize_shipments(scenario())["itineraries"][0]["ordered_stops"]
        self.assertEqual(stops[0]["buyer"], "near")
        self.assertEqual(stops[1]["buyer"], "far")

    def test_pair_with_large_detour_is_not_generated(self):
        data = scenario(far_lon=0.6)
        data["buyer_info"]["far"]["coordinates"] = [0.5, 0.6]
        result = optimize_shipments(data)
        self.assertEqual(len(result["itineraries"][0]["ordered_stops"]), 1)

    def test_second_stop_arrival_uses_both_legs(self):
        itinerary = optimize_shipments(scenario())["itineraries"][0]
        second = itinerary["ordered_stops"][1]
        self.assertAlmostEqual(second["arrival_time"], itinerary["total_distance_km"] / 70, places=6)
        self.assertGreater(second["arrival_time"], itinerary["ordered_stops"][0]["arrival_time"])

    def test_product_deadline_is_checked_at_second_stop(self):
        data = scenario(max_time=1.2)
        result = optimize_shipments(data)
        far_quantity = sum(row["quantity"] for row in result["shipments"] if row["buyer"] == "far")
        self.assertEqual(far_quantity, 0)
        self.assertEqual(result["leftovers"]["berry"], 10)

    def test_pair_capacity_is_shared_between_stops(self):
        data = scenario(capacity=15)
        result = optimize_shipments(data)
        self.assertAlmostEqual(sum(row["quantity"] for row in result["shipments"]), 15)
        self.assertAlmostEqual(result["used_capacity"]["truck"], 15)

    def test_unavailable_vehicle_is_not_used(self):
        data = scenario()
        data["vehicles"]["truck"]["available"] = False
        result = optimize_shipments(data)
        self.assertEqual(result["itineraries"], [])
        self.assertEqual(result["shipments"], [])

    def test_fixed_and_itinerary_cost_are_each_charged_once(self):
        data = scenario()
        result = optimize_shipments(data)
        itinerary = result["itineraries"][0]
        self.assertEqual(len(itinerary["ordered_stops"]), 2)
        self.assertAlmostEqual(result["transport_cost"], itinerary["fixed_vehicle_cost"] + itinerary["itinerary_cost"])
        self.assertAlmostEqual(itinerary["fixed_vehicle_cost"], 30)
        self.assertAlmostEqual(itinerary["contribution_before_fixed_cost"], itinerary["revenue"] - itinerary["itinerary_cost"])

    def test_itinerary_cost_is_not_repeated_for_two_stops(self):
        result = optimize_shipments(scenario())
        itinerary = result["itineraries"][0]
        self.assertEqual(len(itinerary["ordered_stops"]), 2)
        self.assertAlmostEqual(result["transport_cost"] - itinerary["fixed_vehicle_cost"], itinerary["itinerary_cost"])

    def test_refrigerated_vehicle_wins_long_perishable_route_at_equal_profit(self):
        data = scenario(stock=10)
        data["demand"]["berry"] = {"near": 0, "far": 10}
        data["vehicles"]["cold"] = {**data["vehicles"]["truck"], "plate_number": "C1", "refrigeration_hours": 8}
        result = optimize_shipments(data)
        self.assertEqual(result["itineraries"][0]["vehicle"], "cold")

    def test_leftovers_arise_from_demand(self):
        data = scenario(stock=25, capacity=30)
        result = optimize_shipments(data)
        self.assertAlmostEqual(result["leftovers"]["berry"], 5)

    def test_vehicle_breakdown_changes_plan(self):
        data = scenario(stock=20)
        data["vehicles"]["backup"] = {**data["vehicles"]["truck"], "cost": 80, "plate_number": "B1"}
        base = optimize_shipments(data)
        broken = deepcopy(data)
        broken["vehicles"][base["itineraries"][0]["vehicle"]]["available"] = False
        changed = optimize_shipments(broken)
        self.assertNotEqual(base["itineraries"][0]["vehicle"], changed["itineraries"][0]["vehicle"])

    def test_price_change_changes_itinerary(self):
        data = scenario(capacity=10)
        base = optimize_shipments(data)
        changed_data = deepcopy(data)
        changed_data["prices"]["berry"]["far"] = 500
        changed = optimize_shipments(changed_data)
        base_far = sum(row["quantity"] for row in base["shipments"] if row["buyer"] == "far")
        changed_far = sum(row["quantity"] for row in changed["shipments"] if row["buyer"] == "far")
        self.assertGreater(changed_far, base_far)

    def test_api_schema_and_alternatives_have_distinct_itinerary_patterns(self):
        data = scenario()
        data["vehicles"]["backup"] = {**data["vehicles"]["truck"], "cost": 35, "plate_number": "B1"}
        OptimizeRequest.model_validate(data)
        response = compare_routes(CompareRoutesRequest.model_validate({**data, "selected_buyers": data["buyers"], "max_solutions": 3}))
        self.assertGreaterEqual(len(response["solutions"]), 2)
        patterns = [frozenset((item["vehicle"], item["id"]) for item in solution["itineraries"]) for solution in response["solutions"]]
        self.assertEqual(len(patterns), len(set(patterns)))
        for solution in response["solutions"]:
            self.assert_consistent(data, solution)


if __name__ == "__main__":
    unittest.main()
