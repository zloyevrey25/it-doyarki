"""Тесты корректности оптимизатора и обязательных сценариев."""

import unittest
from collections import defaultdict

from backend.main import optimize as api_optimize
from backend.optimizer import optimize_shipments
from backend.sample_data import (
    base_scenario,
    increased_strawberry_price_scenario,
    unavailable_vehicle_scenario,
)
from backend.schemas import OptimizeRequest


class OptimizerTest(unittest.TestCase):
    def assert_feasible_and_consistent(self, data, result):
        by_product = defaultdict(float)
        by_product_buyer = defaultdict(float)
        by_vehicle = defaultdict(float)

        for row in result["shipments"]:
            quantity = row["quantity"]
            self.assertGreaterEqual(quantity, 0)
            self.assertLessEqual(
                data["delivery_time"][row["vehicle"]][row["buyer"]],
                data["max_delivery_time"][row["product"]],
            )
            by_product[row["product"]] += quantity
            by_product_buyer[(row["product"], row["buyer"])] += quantity
            by_vehicle[row["vehicle"]] += quantity

        for product in data["products"]:
            self.assertLessEqual(by_product[product], data["stock"][product] + 1e-6)
            self.assertAlmostEqual(
                result["leftovers"][product],
                data["stock"][product] - by_product[product],
            )
            for buyer in data["buyers"]:
                self.assertLessEqual(
                    by_product_buyer[(product, buyer)],
                    data["demand"][product][buyer] + 1e-6,
                )

        for vehicle_id, vehicle in data["vehicles"].items():
            self.assertLessEqual(by_vehicle[vehicle_id], vehicle["capacity"] + 1e-6)
            if not vehicle["available"]:
                self.assertAlmostEqual(by_vehicle[vehicle_id], 0)
            self.assertAlmostEqual(result["used_capacity"][vehicle_id], by_vehicle[vehicle_id])

        expected_revenue = sum(
            row["quantity"] * data["prices"][row["product"]][row["buyer"]]
            for row in result["shipments"]
        )
        used_routes = {
            (row["vehicle"], row["buyer"]) for row in result["shipments"]
        }
        expected_transport_cost = sum(
            data["vehicles"][vehicle_id]["cost"]
            for vehicle_id, quantity in by_vehicle.items()
            if quantity > 1e-7
        ) + sum(
            data["delivery_cost"][vehicle_id][buyer]
            for vehicle_id, buyer in used_routes
        )
        self.assertAlmostEqual(result["revenue"], expected_revenue)
        self.assertAlmostEqual(result["transport_cost"], expected_transport_cost)
        self.assertAlmostEqual(
            result["profit"], result["revenue"] - result["transport_cost"]
        )

    @staticmethod
    def product_buyer_totals(result):
        totals = defaultdict(float)
        for row in result["shipments"]:
            totals[(row["product"], row["buyer"])] += row["quantity"]
        return totals

    def test_base_scenario(self):
        data = base_scenario()
        result = optimize_shipments(data)

        self.assert_feasible_and_consistent(data, result)
        self.assertAlmostEqual(sum(result["used_capacity"].values()), 270)
        self.assertAlmostEqual(sum(result["leftovers"].values()), 0)

    def test_one_vehicle_unavailable_changes_result(self):
        base_result = optimize_shipments(base_scenario())
        data = unavailable_vehicle_scenario()
        result = optimize_shipments(data)

        self.assert_feasible_and_consistent(data, result)
        self.assertAlmostEqual(result["used_capacity"]["truck_1"], 0)
        self.assertLessEqual(sum(result["used_capacity"].values()), 170)
        self.assertNotEqual(result["profit"], base_result["profit"])
        self.assertGreater(sum(result["leftovers"].values()), 0)

    def test_increased_strawberry_price_changes_plan(self):
        base_result = optimize_shipments(base_scenario())
        data = increased_strawberry_price_scenario()
        result = optimize_shipments(data)

        self.assert_feasible_and_consistent(data, result)
        base_totals = self.product_buyer_totals(base_result)
        changed_totals = self.product_buyer_totals(result)
        self.assertGreater(
            changed_totals[("strawberry", "buyer_5")],
            base_totals[("strawberry", "buyer_5")],
        )
        self.assertGreater(result["profit"], base_result["profit"])

    def test_combined_changes_are_recalculated_by_api(self):
        base_data = base_scenario()
        base_result = api_optimize(OptimizeRequest.model_validate(base_data))

        combined_data = increased_strawberry_price_scenario()
        combined_data["vehicles"]["truck_1"]["available"] = False
        result = api_optimize(OptimizeRequest.model_validate(combined_data))

        self.assert_feasible_and_consistent(combined_data, result)
        self.assertAlmostEqual(result["used_capacity"]["truck_1"], 0)
        self.assertLessEqual(sum(result["used_capacity"].values()), 170)
        self.assertGreaterEqual(result["profit"], 0)
        self.assertNotEqual(result["shipments"], base_result["shipments"])
        self.assertNotEqual(result["profit"], base_result["profit"])

    @staticmethod
    def delivery_time_scenario():
        return {
            "products": ["strawberry", "cucumber"],
            "buyers": ["buyer"],
            "stock": {"strawberry": 1, "cucumber": 1},
            "demand": {
                "strawberry": {"buyer": 1},
                "cucumber": {"buyer": 1},
            },
            "prices": {
                "strawberry": {"buyer": 10},
                "cucumber": {"buyer": 10},
            },
            "vehicles": {
                "truck": {"capacity": 2, "cost": 0, "available": True},
            },
            "max_delivery_time": {"strawberry": 2, "cucumber": 5},
            "delivery_time": {"truck": {"buyer": 3}},
            "delivery_cost": {"truck": {"buyer": 1}},
        }

    def test_perishable_product_cannot_use_slow_route(self):
        result = optimize_shipments(self.delivery_time_scenario())
        totals = self.product_buyer_totals(result)

        self.assertAlmostEqual(totals[("strawberry", "buyer")], 0)
        self.assertAlmostEqual(result["leftovers"]["strawberry"], 1)

    def test_less_perishable_product_can_use_same_route(self):
        result = optimize_shipments(self.delivery_time_scenario())
        totals = self.product_buyer_totals(result)

        self.assertAlmostEqual(totals[("cucumber", "buyer")], 1)
        self.assertAlmostEqual(result["leftovers"]["cucumber"], 0)

    def test_small_scenario_has_known_optimum(self):
        data = {
            "products": ["product"],
            "buyers": ["near", "far"],
            "stock": {"product": 2},
            "demand": {"product": {"near": 1, "far": 1}},
            "prices": {"product": {"near": 10, "far": 8}},
            "vehicles": {
                "truck": {"capacity": 1, "cost": 1, "available": True},
            },
            "max_delivery_time": {"product": 3},
            "delivery_time": {"truck": {"near": 1, "far": 2}},
            "delivery_cost": {"truck": {"near": 1, "far": 4}},
        }

        result = optimize_shipments(data)
        totals = self.product_buyer_totals(result)

        self.assertAlmostEqual(totals[("product", "near")], 1)
        self.assertAlmostEqual(totals[("product", "far")], 0)
        self.assertAlmostEqual(result["revenue"], 10)
        self.assertAlmostEqual(result["transport_cost"], 2)
        self.assertAlmostEqual(result["profit"], 8)
        self.assertAlmostEqual(result["leftovers"]["product"], 1)
        self.assertAlmostEqual(result["used_capacity"]["truck"], 1)

    def test_route_cost_is_charged_once_for_multiple_products(self):
        data = {
            "products": ["strawberry", "tomato"],
            "buyers": ["buyer"],
            "stock": {"strawberry": 1, "tomato": 1},
            "demand": {
                "strawberry": {"buyer": 1},
                "tomato": {"buyer": 1},
            },
            "prices": {
                "strawberry": {"buyer": 10},
                "tomato": {"buyer": 10},
            },
            "vehicles": {
                "truck": {"capacity": 2, "cost": 3, "available": True},
            },
            "max_delivery_time": {"strawberry": 2, "tomato": 4},
            "delivery_time": {"truck": {"buyer": 1}},
            "delivery_cost": {"truck": {"buyer": 4}},
        }

        result = optimize_shipments(data)

        self.assertEqual(len(result["shipments"]), 2)
        self.assertAlmostEqual(result["revenue"], 20)
        self.assertAlmostEqual(result["transport_cost"], 7)
        self.assertAlmostEqual(result["profit"], 13)

    def test_unprofitable_route_is_not_used(self):
        data = {
            "products": ["product"],
            "buyers": ["buyer"],
            "stock": {"product": 1},
            "demand": {"product": {"buyer": 1}},
            "prices": {"product": {"buyer": 5}},
            "vehicles": {
                "truck": {"capacity": 1, "cost": 2, "available": True},
            },
            "max_delivery_time": {"product": 2},
            "delivery_time": {"truck": {"buyer": 1}},
            "delivery_cost": {"truck": {"buyer": 4}},
        }

        result = optimize_shipments(data)

        self.assertEqual(result["shipments"], [])
        self.assertAlmostEqual(result["transport_cost"], 0)
        self.assertAlmostEqual(result["profit"], 0)
        self.assertAlmostEqual(result["leftovers"]["product"], 1)
        self.assertAlmostEqual(result["used_capacity"]["truck"], 0)


if __name__ == "__main__":
    unittest.main()
