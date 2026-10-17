"""Демонстрационные данные для трёх обязательных сценариев."""

from copy import deepcopy
from typing import Any


BASE_DATA: dict[str, Any] = {
    "farm_location": "Республика Татарстан",
    "farm_coordinates": [55.6493585, 49.3054794],
    "products": ["strawberry", "tomato", "cucumber"],
    "buyers": ["buyer_1", "buyer_2", "buyer_3", "buyer_4", "buyer_5"],
    "stock": {
        "strawberry": 80,
        "tomato": 100,
        "cucumber": 90,
    },
    "demand": {
        "strawberry": {
            "buyer_1": 20,
            "buyer_2": 30,
            "buyer_3": 40,
            "buyer_4": 25,
            "buyer_5": 20,
        },
        "tomato": {
            "buyer_1": 20,
            "buyer_2": 25,
            "buyer_3": 30,
            "buyer_4": 40,
            "buyer_5": 30,
        },
        "cucumber": {
            "buyer_1": 10,
            "buyer_2": 20,
            "buyer_3": 30,
            "buyer_4": 20,
            "buyer_5": 30,
        },
    },
    "prices": {
        "strawberry": {
            "buyer_1": 8.0,
            "buyer_2": 7.5,
            "buyer_3": 6.0,
            "buyer_4": 5.5,
            "buyer_5": 5.0,
        },
        "tomato": {
            "buyer_1": 4.0,
            "buyer_2": 4.5,
            "buyer_3": 4.0,
            "buyer_4": 3.5,
            "buyer_5": 3.0,
        },
        "cucumber": {
            "buyer_1": 3.0,
            "buyer_2": 3.5,
            "buyer_3": 3.2,
            "buyer_4": 2.8,
            "buyer_5": 2.5,
        },
    },
    "vehicles": {
        "truck_1": {
            "capacity": 100,
            "cost": 30,
            "available": True,
            "model": "Mercedes-Benz Atego",
            "plate_number": "В456МТ 116",
            "speed_kmh": 70,
            "cost_per_km": 0.7,
            "route_base_cost": 5,
            "refrigeration_hours": 0,
        },
        "truck_2": {
            "capacity": 90,
            "cost": 25,
            "available": True,
            "model": "ГАЗон Next",
            "plate_number": "А123ВС 116",
            "speed_kmh": 68,
            "cost_per_km": 0.65,
            "route_base_cost": 5,
            "refrigeration_hours": 8,
        },
        "truck_3": {
            "capacity": 80,
            "cost": 20,
            "available": True,
            "model": "Isuzu NPR",
            "plate_number": "Е789КХ 116",
            "speed_kmh": 66,
            "cost_per_km": 0.6,
            "route_base_cost": 5,
            "refrigeration_hours": 12,
        },
    },
    "buyer_info": {
        "buyer_1": {"name": "СеверМаркет", "city": "Казань", "distance_km": 25, "coordinates": [55.7944, 49.1110]},
        "buyer_2": {"name": "ВолгаФуд", "city": "Ульяновск", "distance_km": 170, "coordinates": [54.3142, 48.4031]},
        "buyer_3": {"name": "ФрешОпт", "city": "Чебоксары", "distance_km": 140, "coordinates": [56.1439, 47.2489]},
        "buyer_4": {"name": "АгроСбыт", "city": "Самара", "distance_km": 340, "coordinates": [53.1959, 50.1002]},
        "buyer_5": {"name": "ПродуктСити", "city": "Ижевск", "distance_km": 380, "coordinates": [56.8527, 53.2115]},
    },
    "max_delivery_time": {
        "strawberry": 3,
        "tomato": 6,
        "cucumber": 8,
    },
}


def base_scenario() -> dict[str, Any]:
    return deepcopy(BASE_DATA)


def unavailable_vehicle_scenario() -> dict[str, Any]:
    data = base_scenario()
    data["vehicles"]["truck_1"]["available"] = False
    return data


def increased_strawberry_price_scenario() -> dict[str, Any]:
    data = base_scenario()
    data["prices"]["strawberry"]["buyer_5"] = 10.0
    return data
