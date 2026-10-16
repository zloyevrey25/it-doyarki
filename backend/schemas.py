"""Pydantic-схемы HTTP API оптимизатора."""

from typing import Dict, List

from pydantic import BaseModel, ConfigDict, Field, model_validator


class VehicleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    capacity: float = Field(ge=0, allow_inf_nan=False)
    cost: float = Field(ge=0, allow_inf_nan=False)
    available: bool


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    products: List[str] = Field(min_length=1)
    buyers: List[str] = Field(min_length=1)
    stock: Dict[str, float]
    demand: Dict[str, Dict[str, float]]
    prices: Dict[str, Dict[str, float]]
    vehicles: Dict[str, VehicleInput] = Field(min_length=1)
    max_delivery_time: Dict[str, float]
    delivery_time: Dict[str, Dict[str, float]]
    delivery_cost: Dict[str, Dict[str, float]]

    @model_validator(mode="after")
    def validate_related_keys_and_values(self):
        if any(not item.strip() for item in self.products + self.buyers):
            raise ValueError("Идентификаторы не должны быть пустыми")
        if len(set(self.products)) != len(self.products):
            raise ValueError("Идентификаторы продуктов должны быть уникальными")
        if len(set(self.buyers)) != len(self.buyers):
            raise ValueError("Идентификаторы покупателей должны быть уникальными")

        product_keys = set(self.products)
        buyer_keys = set(self.buyers)
        if set(self.stock) != product_keys:
            raise ValueError("stock должен содержать все и только указанные продукты")
        if set(self.demand) != product_keys:
            raise ValueError("demand должен содержать все и только указанные продукты")
        if set(self.prices) != product_keys:
            raise ValueError("prices должен содержать все и только указанные продукты")
        if set(self.max_delivery_time) != product_keys:
            raise ValueError(
                "max_delivery_time должен содержать все и только указанные продукты"
            )

        vehicle_keys = set(self.vehicles)
        if set(self.delivery_time) != vehicle_keys:
            raise ValueError("delivery_time должен содержать все и только указанные машины")
        if set(self.delivery_cost) != vehicle_keys:
            raise ValueError("delivery_cost должен содержать все и только указанные машины")

        for product in self.products:
            if set(self.demand[product]) != buyer_keys:
                raise ValueError(f"demand.{product} должен содержать всех покупателей")
            if set(self.prices[product]) != buyer_keys:
                raise ValueError(f"prices.{product} должен содержать всех покупателей")

        for vehicle_id in self.vehicles:
            if set(self.delivery_time[vehicle_id]) != buyer_keys:
                raise ValueError(
                    f"delivery_time.{vehicle_id} должен содержать всех покупателей"
                )
            if set(self.delivery_cost[vehicle_id]) != buyer_keys:
                raise ValueError(
                    f"delivery_cost.{vehicle_id} должен содержать всех покупателей"
                )

        numeric_values = list(self.stock.values()) + list(self.max_delivery_time.values())
        for product in self.products:
            numeric_values.extend(self.demand[product].values())
            numeric_values.extend(self.prices[product].values())
        for vehicle_id in self.vehicles:
            numeric_values.extend(self.delivery_time[vehicle_id].values())
            numeric_values.extend(self.delivery_cost[vehicle_id].values())
        if any(value < 0 for value in numeric_values):
            raise ValueError("Числовые параметры не могут быть отрицательными")

        return self


class ShipmentOutput(BaseModel):
    product: str
    buyer: str
    vehicle: str
    quantity: float


class OptimizeResponse(BaseModel):
    shipments: List[ShipmentOutput]
    revenue: float
    transport_cost: float
    profit: float
    leftovers: Dict[str, float]
    used_capacity: Dict[str, float]
