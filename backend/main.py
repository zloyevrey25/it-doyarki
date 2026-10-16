"""Минимальный FastAPI-интерфейс оптимизатора поставок."""

from copy import deepcopy

from fastapi import FastAPI, HTTPException

from backend.optimizer import optimize_alternatives, optimize_shipments
from backend.schemas import (
    CompareRoutesRequest,
    CompareRoutesResponse,
    OptimizeRequest,
    OptimizeResponse,
)


app = FastAPI(title="Delivery Optimizer API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(payload: OptimizeRequest) -> dict:
    try:
        return optimize_shipments(payload.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


def _selected_buyers_data(data: dict, selected_buyers: list[str]) -> dict:
    filtered = deepcopy(data)
    selected = set(selected_buyers)
    filtered["buyers"] = [buyer for buyer in data["buyers"] if buyer in selected]

    for product in data["products"]:
        filtered["demand"][product] = {
            buyer: data["demand"][product][buyer] for buyer in filtered["buyers"]
        }
        filtered["prices"][product] = {
            buyer: data["prices"][product][buyer] for buyer in filtered["buyers"]
        }
    for vehicle_id in data["vehicles"]:
        filtered["delivery_time"][vehicle_id] = {
            buyer: data["delivery_time"][vehicle_id][buyer]
            for buyer in filtered["buyers"]
        }
        filtered["delivery_cost"][vehicle_id] = {
            buyer: data["delivery_cost"][vehicle_id][buyer]
            for buyer in filtered["buyers"]
        }
    filtered["buyer_info"] = {
        buyer: data.get("buyer_info", {}).get(buyer, {})
        for buyer in filtered["buyers"]
        if buyer in data.get("buyer_info", {})
    }
    return filtered


@app.post("/compare-routes", response_model=CompareRoutesResponse)
def compare_routes(payload: CompareRoutesRequest) -> dict:
    try:
        request_data = payload.model_dump()
        selected_buyers = request_data.pop("selected_buyers")
        max_solutions = request_data.pop("max_solutions")
        data = _selected_buyers_data(request_data, selected_buyers)
        raw_solutions = optimize_alternatives(data, max_solutions)

        solutions = []
        for index, result in enumerate(raw_solutions, start=1):
            used_buyers = {
                row["buyer"] for row in result["shipments"]
            }
            used_vehicles = {
                row["vehicle"] for row in result["shipments"]
            }
            solutions.append(
                {
                    **result,
                    "rank": index,
                    "recommended": index == 1,
                    "buyers_used": [
                        buyer for buyer in data["buyers"] if buyer in used_buyers
                    ],
                    "vehicles_used": [
                        vehicle_id
                        for vehicle_id in data["vehicles"]
                        if vehicle_id in used_vehicles
                    ],
                    "total_delivery_time": round(
                        sum(route["delivery_time"] for route in result["route_metrics"]),
                        6,
                    ),
                }
            )

        recommended = solutions[0]
        formatted_profit = f'{recommended["profit"]:,.2f}'.replace(",", " ")
        return {
            "solutions": solutions,
            "recommended_solution": recommended,
            "explanation": (
                f"Решение 1 рекомендовано, так как даёт максимальную прибыль "
                f"{formatted_profit} ₽ при соблюдении ограничений по запасам, "
                "спросу, вместимости транспорта и времени доставки."
            ),
        }
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
