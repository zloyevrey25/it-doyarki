"""Минимальный линейный оптимизатор поставок на PuLP."""

from math import isfinite
from typing import Any

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


def optimize_shipments(data: dict[str, Any]) -> dict[str, Any]:
    """Рассчитать план с максимальной прибылью.

    Объёмы считаются непрерывными, каждая машина может выполнить один рейс,
    а её стоимость списывается один раз, если машина используется.
    """
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
        * shipped[product][buyer][vehicle_id]
        for product in products
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

    status_code = model.solve(pulp.PULP_CBC_CMD(msg=False))
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
        row["quantity"] * data["delivery_cost"][row["vehicle"]][row["buyer"]]
        for row in shipments
    )
    calculated_transport_cost = fixed_cost + route_cost

    return {
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
