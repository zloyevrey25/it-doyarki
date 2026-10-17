"""Оптимизатор поставок с одним прямым или парным рейсом на машину."""

from math import asin, cos, isfinite, radians, sin, sqrt
from typing import Any, Optional

import pulp


ROAD_DISTANCE_FACTOR = 1.18
PAIR_DETOUR_LIMIT = 1.15
TOLERANCE = 1e-7
PROFIT_TOLERANCE_RUB = 0.01


def _haversine_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    lat1, lon1 = map(radians, first)
    lat2, lon2 = map(radians, second)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(value))


def _road_distance_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    return _haversine_km(first, second) * ROAD_DISTANCE_FACTOR


def _validate_data(data: dict[str, Any]) -> None:
    required = {"products", "buyers", "stock", "demand", "prices", "vehicles", "max_delivery_time", "farm_coordinates", "buyer_info"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Не хватает полей: {', '.join(sorted(missing))}")
    products, buyers, vehicles = data["products"], data["buyers"], data["vehicles"]
    if not products or not buyers or not vehicles:
        raise ValueError("Списки продуктов, покупателей и машин не должны быть пустыми")
    if len(set(products)) != len(products) or len(set(buyers)) != len(buyers):
        raise ValueError("Идентификаторы продуктов и покупателей должны быть уникальными")
    if any(set(data[field]) != set(products) for field in ("stock", "demand", "prices", "max_delivery_time")):
        raise ValueError("Поля продуктов должны содержать все продукты")
    if set(data["buyer_info"]) != set(buyers):
        raise ValueError("buyer_info должен содержать всех покупателей")

    coordinates = [("farm_coordinates", data["farm_coordinates"])] + [(f"buyer_info.{buyer}.coordinates", data["buyer_info"][buyer]["coordinates"]) for buyer in buyers]
    for name, point in coordinates:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValueError(f"{name} должен содержать широту и долготу")
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value) for value in point):
            raise ValueError(f"{name} должен содержать конечные числа")
        if not -90 <= point[0] <= 90 or not -180 <= point[1] <= 180:
            raise ValueError(f"{name} содержит недопустимые координаты")

    values: list[tuple[str, Any]] = []
    for product in products:
        if set(data["demand"][product]) != set(buyers) or set(data["prices"][product]) != set(buyers):
            raise ValueError(f"demand.{product} и prices.{product} должны содержать всех покупателей")
        values.extend([(f"stock.{product}", data["stock"][product]), (f"max_delivery_time.{product}", data["max_delivery_time"][product])])
        for buyer in buyers:
            values.extend([(f"demand.{product}.{buyer}", data["demand"][product][buyer]), (f"prices.{product}.{buyer}", data["prices"][product][buyer])])
    for vehicle_id, vehicle in vehicles.items():
        for field in ("capacity", "cost", "speed_kmh", "cost_per_km", "route_base_cost"):
            values.append((f"vehicles.{vehicle_id}.{field}", vehicle[field]))
        values.append((f"vehicles.{vehicle_id}.refrigeration_hours", vehicle.get("refrigeration_hours", 0)))
        if not isinstance(vehicle["available"], bool):
            raise ValueError(f"vehicles.{vehicle_id}.available должен быть bool")
        if vehicle["speed_kmh"] <= 0:
            raise ValueError(f"vehicles.{vehicle_id}.speed_kmh должен быть больше нуля")
    for name, value in values:
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value) or value < 0:
            raise ValueError(f"{name} должен быть конечным неотрицательным числом")


def _candidate_itineraries(data: dict[str, Any]) -> list[dict[str, Any]]:
    farm = tuple(data["farm_coordinates"])
    points = {buyer: tuple(data["buyer_info"][buyer]["coordinates"]) for buyer in data["buyers"]}
    from_farm = {buyer: _road_distance_km(farm, point) for buyer, point in points.items()}
    result = [{"id": f"direct__{buyer}", "stops": (buyer,), "leg_distances": (from_farm[buyer],), "cumulative_distances": (from_farm[buyer],), "total_distance": from_farm[buyer]} for buyer in data["buyers"]]
    for first in data["buyers"]:
        for second in data["buyers"]:
            if first == second or from_farm[first] >= from_farm[second] - TOLERANCE:
                continue
            between = _road_distance_km(points[first], points[second])
            total = from_farm[first] + between
            if total <= from_farm[second] * PAIR_DETOUR_LIMIT + TOLERANCE:
                result.append({"id": f"pair__{first}__{second}", "stops": (first, second), "leg_distances": (from_farm[first], between), "cumulative_distances": (from_farm[first], total), "total_distance": total})
    return result


def _spoilage_risk(max_time: float, margin: float) -> str:
    if max_time == 0 or margin >= 0.5 * max_time:
        return "low"
    if margin >= 0.2 * max_time:
        return "medium"
    return "high"


def _solve_model(data: dict[str, Any], excluded_patterns: Optional[list[frozenset[tuple[str, str]]]] = None) -> tuple[dict[str, Any], frozenset[tuple[str, str]]]:
    _validate_data(data)
    products, buyers, vehicles = data["products"], data["buyers"], data["vehicles"]
    vehicle_ids = list(vehicles)
    candidates = _candidate_itineraries(data)
    by_id = {item["id"]: item for item in candidates}
    itinerary_ids = list(by_id)
    model = pulp.LpProblem("itinerary_profit", pulp.LpMaximize)
    chosen = pulp.LpVariable.dicts("itinerary", (vehicle_ids, itinerary_ids), cat="Binary")
    shipment_keys = [(product, buyer, vehicle_id, item["id"]) for product in products for vehicle_id in vehicle_ids for item in candidates for buyer in item["stops"]]
    shipped = pulp.LpVariable.dicts("shipment", shipment_keys, lowBound=0, cat="Continuous")

    revenue_expr = pulp.lpSum(data["prices"][product][buyer] * shipped[(product, buyer, vehicle_id, itinerary_id)] for product, buyer, vehicle_id, itinerary_id in shipment_keys)
    fixed_cost_expr = pulp.lpSum(vehicles[vehicle_id]["cost"] * chosen[vehicle_id][itinerary_id] for vehicle_id in vehicle_ids for itinerary_id in itinerary_ids)
    route_cost_expr = pulp.lpSum((vehicles[vehicle_id]["route_base_cost"] + by_id[itinerary_id]["total_distance"] * vehicles[vehicle_id]["cost_per_km"]) * chosen[vehicle_id][itinerary_id] for vehicle_id in vehicle_ids for itinerary_id in itinerary_ids)
    profit_expr = revenue_expr - fixed_cost_expr - route_cost_expr
    model += profit_expr

    for product in products:
        model += pulp.lpSum(shipped[key] for key in shipment_keys if key[0] == product) <= data["stock"][product]
        for buyer in buyers:
            model += pulp.lpSum(shipped[key] for key in shipment_keys if key[0] == product and key[1] == buyer) <= data["demand"][product][buyer]
    for vehicle_id in vehicle_ids:
        model += pulp.lpSum(chosen[vehicle_id][itinerary_id] for itinerary_id in itinerary_ids) <= int(vehicles[vehicle_id]["available"])
        for itinerary_id in itinerary_ids:
            item = by_id[itinerary_id]
            route_variables = [shipped[key] for key in shipment_keys if key[2] == vehicle_id and key[3] == itinerary_id]
            model += pulp.lpSum(route_variables) <= vehicles[vehicle_id]["capacity"] * chosen[vehicle_id][itinerary_id]
            model += pulp.lpSum(route_variables) >= 0.0001 * chosen[vehicle_id][itinerary_id]
            for index, buyer in enumerate(item["stops"]):
                model += pulp.lpSum(
                    shipped[(product, buyer, vehicle_id, itinerary_id)]
                    for product in products
                ) >= 0.0001 * chosen[vehicle_id][itinerary_id]
                arrival = item["cumulative_distances"][index] / vehicles[vehicle_id]["speed_kmh"]
                for product in products:
                    if arrival > data["max_delivery_time"][product] + vehicles[vehicle_id].get("refrigeration_hours", 0) + TOLERANCE:
                        model += shipped[(product, buyer, vehicle_id, itinerary_id)] == 0

    all_choices = [(vehicle_id, itinerary_id) for vehicle_id in vehicle_ids for itinerary_id in itinerary_ids]
    for pattern in excluded_patterns or []:
        model += pulp.lpSum(1 - chosen[v][i] if (v, i) in pattern else chosen[v][i] for v, i in all_choices) >= 1

    solver = pulp.PULP_CBC_CMD(msg=False, options=["preprocess off"])
    status = pulp.LpStatus[model.solve(solver)]
    if status != "Optimal":
        raise RuntimeError(f"Оптимальное решение не найдено: {status}")
    maximum_profit = pulp.value(profit_expr) or 0.0
    model += profit_expr >= maximum_profit - PROFIT_TOLERANCE_RUB + TOLERANCE
    margin_expr = pulp.lpSum((data["max_delivery_time"][product] + vehicles[vehicle_id].get("refrigeration_hours", 0) - by_id[itinerary_id]["cumulative_distances"][by_id[itinerary_id]["stops"].index(buyer)] / vehicles[vehicle_id]["speed_kmh"]) * shipped[(product, buyer, vehicle_id, itinerary_id)] for product, buyer, vehicle_id, itinerary_id in shipment_keys)
    model.setObjective(margin_expr)
    status = pulp.LpStatus[model.solve(solver)]
    if status != "Optimal":
        raise RuntimeError(f"Второй этап оптимизации не найден: {status}")

    pattern = frozenset((v, i) for v, i in all_choices if (chosen[v][i].value() or 0) > 0.5)
    shipments: list[dict[str, Any]] = []
    itinerary_outputs: list[dict[str, Any]] = []
    used_capacity = {vehicle_id: 0.0 for vehicle_id in vehicle_ids}
    shipped_by_product = {product: 0.0 for product in products}
    for vehicle_id, itinerary_id in sorted(pattern):
        vehicle, item = vehicles[vehicle_id], by_id[itinerary_id]
        stops, risks = [], []
        itinerary_revenue = itinerary_load = 0.0
        for index, buyer in enumerate(item["stops"]):
            arrival = item["cumulative_distances"][index] / vehicle["speed_kmh"]
            unloads = []
            for product in products:
                quantity = shipped[(product, buyer, vehicle_id, itinerary_id)].value() or 0.0
                if quantity <= TOLERANCE:
                    continue
                quantity = round(quantity, 6)
                max_time = data["max_delivery_time"][product] + vehicle.get("refrigeration_hours", 0)
                margin = round(max_time - arrival, 6)
                risk = _spoilage_risk(max_time, margin)
                shipments.append({"product": product, "buyer": buyer, "vehicle": vehicle_id, "itinerary_id": itinerary_id, "stop_order": index + 1, "quantity": quantity, "arrival_time": round(arrival, 6), "delivery_time_margin": margin, "spoilage_risk": risk})
                unloads.append({"product": product, "quantity": quantity, "delivery_time_margin": margin, "spoilage_risk": risk})
                itinerary_revenue += quantity * data["prices"][product][buyer]
                itinerary_load += quantity
                shipped_by_product[product] += quantity
                used_capacity[vehicle_id] += quantity
                risks.append(risk)
            stops.append({"order": index + 1, "buyer": buyer, "buyer_name": data["buyer_info"][buyer].get("name", buyer), "city": data["buyer_info"][buyer].get("city", ""), "coordinates": list(data["buyer_info"][buyer]["coordinates"]), "leg_distance_km": round(item["leg_distances"][index], 6), "distance_km": round(item["cumulative_distances"][index], 6), "arrival_time": round(arrival, 6), "unloads": unloads})
        route_cost = vehicle["route_base_cost"] + item["total_distance"] * vehicle["cost_per_km"]
        worst = "high" if "high" in risks else "medium" if "medium" in risks else "low"
        itinerary_outputs.append({"id": itinerary_id, "vehicle": vehicle_id, "ordered_stops": stops, "total_distance_km": round(item["total_distance"], 6), "total_time": round(item["total_distance"] / vehicle["speed_kmh"], 6), "total_load_kg": round(itinerary_load, 6), "itinerary_cost": round(route_cost, 6), "fixed_vehicle_cost": round(vehicle["cost"], 6), "revenue": round(itinerary_revenue, 6), "contribution_before_fixed_cost": round(itinerary_revenue - route_cost, 6), "refrigeration_hours": round(vehicle.get("refrigeration_hours", 0), 6), "spoilage_risk": worst})
    revenue = sum(item["revenue"] for item in itinerary_outputs)
    transport_cost = sum(item["itinerary_cost"] + item["fixed_vehicle_cost"] for item in itinerary_outputs)
    return {"shipments": shipments, "itineraries": itinerary_outputs, "revenue": round(revenue, 6), "transport_cost": round(transport_cost, 6), "profit": round(revenue - transport_cost, 6), "leftovers": {product: round(data["stock"][product] - shipped_by_product[product], 6) for product in products}, "used_capacity": {vehicle_id: round(value, 6) for vehicle_id, value in used_capacity.items()}}, pattern


def _add_result_metrics(data: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    buyer_metrics = {}
    for buyer in data["buyers"]:
        info = data["buyer_info"][buyer]
        metrics, total = {}, 0.0
        for product in data["products"]:
            requested, price = data["demand"][product][buyer], data["prices"][product][buyer]
            potential = requested * price
            total += potential
            metrics[product] = {"requested_kg": requested, "price_per_kg": price, "potential_revenue": round(potential, 6)}
        buyer_metrics[buyer] = {"name": info.get("name", buyer), "city": info.get("city", ""), "distance_km": round(_road_distance_km(tuple(data["farm_coordinates"]), tuple(info["coordinates"])), 6), "products": metrics, "total_potential_revenue": round(total, 6)}
    total_shipped = sum(row["quantity"] for row in result["shipments"])
    total_demand = sum(data["demand"][p][b] for p in data["products"] for b in data["buyers"])
    result["buyer_metrics"] = buyer_metrics
    result["plan_metrics"] = {"total_shipped_kg": round(total_shipped, 6), "total_leftovers_kg": round(sum(result["leftovers"].values()), 6), "total_demand_kg": round(total_demand, 6), "fulfilled_demand_kg": round(total_shipped, 6), "fulfillment_rate_percent": round(total_shipped / total_demand * 100 if total_demand else 0, 6), "profit_margin_percent": round(result["profit"] / result["revenue"] * 100 if result["revenue"] else 0, 6)}
    result["vehicle_metrics"] = {}
    for vehicle_id, vehicle in data["vehicles"].items():
        used = result["used_capacity"][vehicle_id]
        result["vehicle_metrics"][vehicle_id] = {"model": vehicle.get("model", ""), "plate_number": vehicle.get("plate_number", ""), "capacity_kg": vehicle["capacity"], "used_capacity_kg": used, "free_capacity_kg": round(vehicle["capacity"] - used, 6), "utilization_percent": round(used / vehicle["capacity"] * 100 if vehicle["capacity"] else 0, 6), "available": vehicle["available"], "used": used > TOLERANCE}
    result["route_metrics"] = [{"itinerary_id": item["id"], "vehicle": item["vehicle"], "buyers": [stop["buyer"] for stop in item["ordered_stops"]], "buyer_names": [stop["buyer_name"] for stop in item["ordered_stops"]], "cities": [stop["city"] for stop in item["ordered_stops"]], "distance_km": item["total_distance_km"], "delivery_time": item["total_time"], "route_cost": item["itinerary_cost"], "shipped_kg": item["total_load_kg"], "route_revenue": item["revenue"], "route_profit": item["contribution_before_fixed_cost"]} for item in result["itineraries"]]
    return result


def optimize_shipments(data: dict[str, Any]) -> dict[str, Any]:
    result, _ = _solve_model(data)
    return _add_result_metrics(data, result)


def optimize_alternatives(data: dict[str, Any], max_solutions: int = 3) -> list[dict[str, Any]]:
    excluded, seen, solutions = [], set(), []
    while len(solutions) < max_solutions:
        result, pattern = _solve_model(data, excluded)
        if pattern in seen or (not pattern and solutions):
            break
        excluded.append(pattern)
        seen.add(pattern)
        enriched = _add_result_metrics(data, result)
        if enriched["profit"] <= 0 and solutions:
            break
        solutions.append(enriched)
        if not pattern or enriched["profit"] <= 0:
            break
    solutions.sort(key=lambda item: item["profit"], reverse=True)
    return solutions
