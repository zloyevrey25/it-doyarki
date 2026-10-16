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
        self.assertAlmostEqual(result["revenue"], expected_revenue)
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


if __name__ == "__main__":
    unittest.main()
