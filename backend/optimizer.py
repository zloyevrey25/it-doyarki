"""Минимальный линейный оптимизатор поставок на PuLP."""

from math import isfinite
from typing import Any, Optional

import pulp


def _validate_data(data: dict[str, Any]) -> None:
    required = {
        "products",
        "buyers",
        "stock",
        "demand",
        "prices",
        "vehicles",
        "max_delivery_time",
        "delivery_time",
        "delivery_cost",
    }
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Не хватает полей: {', '.join(sorted(missing))}")

    products = data["products"]
    buyers = data["buyers"]
    vehicles = data["vehicles"]

    if not products or not buyers or not vehicles:
        raise ValueError("Списки продуктов, покупателей и машин не должны быть пустыми")
    if len(set(products)) != len(products) or len(set(buyers)) != len(buyers):
        raise ValueError("Идентификаторы продуктов и покупателей должны быть уникальными")
    if set(data["max_delivery_time"]) != set(products):
        raise ValueError("max_delivery_time должен содержать все продукты")
    if set(data["delivery_time"]) != set(vehicles):
        raise ValueError("delivery_time должен содержать все машины")
    if set(data["delivery_cost"]) != set(vehicles):
        raise ValueError("delivery_cost должен содержать все машины")

    values: list[tuple[str, Any]] = []
    for product in products:
        values.append((f"stock.{product}", data["stock"][product]))
        values.append(
            (f"max_delivery_time.{product}", data["max_delivery_time"][product])
        )
        for buyer in buyers:
            values.append((f"demand.{product}.{buyer}", data["demand"][product][buyer]))
            values.append((f"prices.{product}.{buyer}", data["prices"][product][buyer]))

    for vehicle_id, vehicle in vehicles.items():
        if set(data["delivery_time"][vehicle_id]) != set(buyers):
            raise ValueError(f"delivery_time.{vehicle_id} должен содержать всех покупателей")
        if set(data["delivery_cost"][vehicle_id]) != set(buyers):
            raise ValueError(f"delivery_cost.{vehicle_id} должен содержать всех покупателей")
        values.append((f"vehicles.{vehicle_id}.capacity", vehicle["capacity"]))
        values.append((f"vehicles.{vehicle_id}.cost", vehicle["cost"]))
        if not isinstance(vehicle["available"], bool):
            raise ValueError(f"vehicles.{vehicle_id}.available должен быть bool")
        for buyer in buyers:
            values.append(
                (
                    f"delivery_time.{vehicle_id}.{buyer}",
                    data["delivery_time"][vehicle_id][buyer],
                )
            )
            values.append(
                (
                    f"delivery_cost.{vehicle_id}.{buyer}",
                    data["delivery_cost"][vehicle_id][buyer],
                )
            )

    for name, value in values:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{name} должен быть числом")
        if not isfinite(value) or value < 0:
            raise ValueError(f"{name} должен быть конечным неотрицательным числом")


def _solve_model(
    data: dict[str, Any],
    excluded_route_patterns: Optional[list[frozenset[tuple[str, str]]]] = None,
) -> tuple[dict[str, Any], frozenset[tuple[str, str]]]:
    """Решить исходную MILP, при необходимости исключив найденные маршруты."""
    _validate_data(data)

    products = data["products"]
    buyers = data["buyers"]
    vehicles = data["vehicles"]
    vehicle_ids = list(vehicles)

    model = pulp.LpProblem("delivery_profit", pulp.LpMaximize)
    shipped = pulp.LpVariable.dicts(
        "shipment", (products, buyers, vehicle_ids), lowBound=0, cat="Continuous"
    )
    vehicle_used = pulp.LpVariable.dicts(
        "vehicle_used", vehicle_ids, lowBound=0, upBound=1, cat="Binary"
    )
    route_used = pulp.LpVariable.dicts(
        "route_used", (vehicle_ids, buyers), lowBound=0, upBound=1, cat="Binary"
    )

    revenue = pulp.lpSum(
        data["prices"][product][buyer] * shipped[product][buyer][vehicle_id]
        for product in products
        for buyer in buyers
        for vehicle_id in vehicle_ids
    )
    fixed_transport_cost = pulp.lpSum(
        vehicles[vehicle_id]["cost"] * vehicle_used[vehicle_id]
        for vehicle_id in vehicle_ids
    )
    route_transport_cost = pulp.lpSum(
        data["delivery_cost"][vehicle_id][buyer]
        * route_used[vehicle_id][buyer]
        for buyer in buyers
        for vehicle_id in vehicle_ids
    )
    model += revenue - fixed_transport_cost - route_transport_cost

    for product in products:
        model += (
            pulp.lpSum(
                shipped[product][buyer][vehicle_id]
                for buyer in buyers
                for vehicle_id in vehicle_ids
            )
            <= data["stock"][product]
        )

        for buyer in buyers:
            model += (
                pulp.lpSum(
                    shipped[product][buyer][vehicle_id] for vehicle_id in vehicle_ids
                )
                <= data["demand"][product][buyer]
            )
            for vehicle_id in vehicle_ids:
                if (
                    data["delivery_time"][vehicle_id][buyer]
                    > data["max_delivery_time"][product]
                ):
                    model += shipped[product][buyer][vehicle_id] == 0

    for vehicle_id in vehicle_ids:
        model += (
            pulp.lpSum(
                shipped[product][buyer][vehicle_id]
                for product in products
                for buyer in buyers
            )
            <= vehicles[vehicle_id]["capacity"] * vehicle_used[vehicle_id]
        )
        model += vehicle_used[vehicle_id] <= int(vehicles[vehicle_id]["available"])
        for buyer in buyers:
            model += (
                pulp.lpSum(
                    shipped[product][buyer][vehicle_id] for product in products
                )
                <= vehicles[vehicle_id]["capacity"] * route_used[vehicle_id][buyer]
            )
            model += route_used[vehicle_id][buyer] <= vehicle_used[vehicle_id]

    all_routes = [
        (vehicle_id, buyer) for vehicle_id in vehicle_ids for buyer in buyers
    ]
    for pattern in excluded_route_patterns or []:
        model += (
            pulp.lpSum(
                1 - route_used[vehicle_id][buyer]
                if (vehicle_id, buyer) in pattern
                else route_used[vehicle_id][buyer]
                for vehicle_id, buyer in all_routes
            )
            >= 1
        )

    status_code = model.solve(
        pulp.PULP_CBC_CMD(msg=False, options=["preprocess off"])
    )
    status = pulp.LpStatus[status_code]
    if status != "Optimal":
        raise RuntimeError(f"Оптимальное решение не найдено: {status}")

    tolerance = 1e-7
    shipments: list[dict[str, Any]] = []
    shipped_by_product = {product: 0.0 for product in products}
    used_capacity = {vehicle_id: 0.0 for vehicle_id in vehicle_ids}

    for product in products:
        for buyer in buyers:
            for vehicle_id in vehicle_ids:
                quantity = shipped[product][buyer][vehicle_id].value() or 0.0
                if quantity > tolerance:
                    quantity = round(quantity, 6)
                    shipments.append(
                        {
                            "product": product,
                            "buyer": buyer,
                            "vehicle": vehicle_id,
                            "quantity": quantity,
                        }
                    )
                    shipped_by_product[product] += quantity
                    used_capacity[vehicle_id] += quantity

    calculated_revenue = sum(
        row["quantity"] * data["prices"][row["product"]][row["buyer"]]
        for row in shipments
    )
    fixed_cost = sum(
        vehicles[vehicle_id]["cost"]
        for vehicle_id in vehicle_ids
        if (vehicle_used[vehicle_id].value() or 0.0) > 0.5
    )
    route_cost = sum(
        data["delivery_cost"][vehicle_id][buyer]
        for vehicle_id in vehicle_ids
        for buyer in buyers
        if (route_used[vehicle_id][buyer].value() or 0.0) > 0.5
    )
    calculated_transport_cost = fixed_cost + route_cost

    result = {
        "shipments": shipments,
        "revenue": round(calculated_revenue, 6),
        "transport_cost": round(calculated_transport_cost, 6),
        "profit": round(calculated_revenue - calculated_transport_cost, 6),
        "leftovers": {
            product: round(data["stock"][product] - shipped_by_product[product], 6)
            for product in products
        },
        "used_capacity": {
            vehicle_id: round(used_capacity[vehicle_id], 6)
            for vehicle_id in vehicle_ids
        },
    }
    route_pattern = frozenset(
        (vehicle_id, buyer)
        for vehicle_id, buyer in all_routes
        if (route_used[vehicle_id][buyer].value() or 0.0) > 0.5
    )
    return result, route_pattern


def _spoilage_risk(max_delivery_time: float, margin: float) -> str:
    if max_delivery_time == 0 or margin >= 0.5 * max_delivery_time:
        return "low"
    if margin >= 0.2 * max_delivery_time:
        return "medium"
    return "high"


def _add_result_metrics(data: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    """Добавить объясняющие метрики, не влияющие на целевую функцию."""
    enriched_shipments = []
    for row in result["shipments"]:
        delivery_time = data["delivery_time"][row["vehicle"]][row["buyer"]]
        max_time = data["max_delivery_time"][row["product"]]
        margin = round(max_time - delivery_time, 6)
        enriched_shipments.append(
            {
                **row,
                "delivery_time_margin": margin,
                "spoilage_risk": _spoilage_risk(max_time, margin),
            }
        )
    result["shipments"] = enriched_shipments

    buyer_info = data.get("buyer_info", {})
    buyer_metrics = {}
    for buyer in data["buyers"]:
        info = buyer_info.get(buyer, {})
        product_metrics = {}
        total_potential_revenue = 0.0
        for product in data["products"]:
            requested = data["demand"][product][buyer]
            price = data["prices"][product][buyer]
            potential_revenue = requested * price
            total_potential_revenue += potential_revenue
            product_metrics[product] = {
                "requested_kg": requested,
                "price_per_kg": price,
                "potential_revenue": round(potential_revenue, 6),
            }
        buyer_metrics[buyer] = {
            "name": info.get("name", buyer),
            "city": info.get("city", ""),
            "distance_km": info.get("distance_km", 0),
            "products": product_metrics,
            "total_potential_revenue": round(total_potential_revenue, 6),
        }

    total_shipped = sum(row["quantity"] for row in enriched_shipments)
    total_leftovers = sum(result["leftovers"].values())
    total_demand = sum(
        data["demand"][product][buyer]
        for product in data["products"]
        for buyer in data["buyers"]
    )
    fulfillment_rate = total_shipped / total_demand * 100 if total_demand else 0
    profit_margin = result["profit"] / result["revenue"] * 100 if result["revenue"] else 0
    plan_metrics = {
        "total_shipped_kg": round(total_shipped, 6),
        "total_leftovers_kg": round(total_leftovers, 6),
        "total_demand_kg": round(total_demand, 6),
        "fulfilled_demand_kg": round(total_shipped, 6),
        "fulfillment_rate_percent": round(fulfillment_rate, 6),
        "profit_margin_percent": round(profit_margin, 6),
    }

    vehicle_metrics = {}
    for vehicle_id, vehicle in data["vehicles"].items():
        used_capacity = result["used_capacity"][vehicle_id]
        capacity = vehicle["capacity"]
        utilization = used_capacity / capacity * 100 if capacity else 0
        vehicle_metrics[vehicle_id] = {
            "model": vehicle.get("model", ""),
            "plate_number": vehicle.get("plate_number", ""),
            "capacity_kg": capacity,
            "used_capacity_kg": used_capacity,
            "free_capacity_kg": round(capacity - used_capacity, 6),
            "utilization_percent": round(utilization, 6),
            "available": vehicle["available"],
            "used": used_capacity > 1e-7,
        }

    route_totals: dict[tuple[str, str], dict[str, float]] = {}
    for row in enriched_shipments:
        key = (row["vehicle"], row["buyer"])
        totals = route_totals.setdefault(key, {"shipped_kg": 0.0, "revenue": 0.0})
        totals["shipped_kg"] += row["quantity"]
        totals["revenue"] += (
            row["quantity"] * data["prices"][row["product"]][row["buyer"]]
        )

    route_metrics = []
    for vehicle_id in data["vehicles"]:
        for buyer in data["buyers"]:
            key = (vehicle_id, buyer)
            if key not in route_totals:
                continue
            totals = route_totals[key]
            info = buyer_info.get(buyer, {})
            route_cost = data["delivery_cost"][vehicle_id][buyer]
            route_revenue = totals["revenue"]
            route_metrics.append(
                {
                    "vehicle": vehicle_id,
                    "buyer": buyer,
                    "buyer_name": info.get("name", buyer),
                    "city": info.get("city", ""),
                    "distance_km": info.get("distance_km", 0),
                    "delivery_time": data["delivery_time"][vehicle_id][buyer],
                    "route_cost": route_cost,
                    "shipped_kg": round(totals["shipped_kg"], 6),
                    "route_revenue": round(route_revenue, 6),
                    # Фиксированная стоимость машины здесь не дублируется.
                    "route_profit": round(route_revenue - route_cost, 6),
                }
            )

    result["buyer_metrics"] = buyer_metrics
    result["plan_metrics"] = plan_metrics
    result["vehicle_metrics"] = vehicle_metrics
    result["route_metrics"] = route_metrics
    return result


def optimize_shipments(data: dict[str, Any]) -> dict[str, Any]:
    """Рассчитать единственный наиболее прибыльный план поставок."""
    result, _ = _solve_model(data)
    return _add_result_metrics(data, result)


def optimize_alternatives(
    data: dict[str, Any], max_solutions: int = 3
) -> list[dict[str, Any]]:
    """Вернуть различные прибыльные планы в порядке убывания прибыли."""
    excluded_patterns: list[frozenset[tuple[str, str]]] = []
    seen_routes: set[frozenset[tuple[str, str]]] = set()
    solutions = []
    attempts = 0
    max_attempts = max(10, max_solutions * 10)

    while len(solutions) < max_solutions and attempts < max_attempts:
        result, binary_pattern = _solve_model(data, excluded_patterns)
        excluded_patterns.append(binary_pattern)
        attempts += 1

        actual_routes = frozenset(
            (row["vehicle"], row["buyer"]) for row in result["shipments"]
        )
        if actual_routes in seen_routes:
            continue
        if not actual_routes and solutions:
            break

        seen_routes.add(actual_routes)
        enriched = _add_result_metrics(data, result)
        if enriched["profit"] <= 0 and solutions:
            break
        solutions.append(enriched)

        if not actual_routes or enriched["profit"] <= 0:
            break

    return solutions
