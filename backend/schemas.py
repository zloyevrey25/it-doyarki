"""Pydantic-схемы HTTP API оптимизатора."""

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class VehicleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    capacity: float = Field(ge=0, allow_inf_nan=False)
    cost: float = Field(ge=0, allow_inf_nan=False)
    available: bool
    model: str = ""
    plate_number: str = ""


class BuyerInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    city: str
    distance_km: float = Field(ge=0, allow_inf_nan=False)


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
    delivery_cost: Dict[str, Dict[str, float]]  # стоимость отдельного рейса
    farm_location: Optional[str] = None
    buyer_info: Dict[str, BuyerInfoInput] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_related_keys_and_values(self):
        if any(not item.strip() for item in self.products + self.buyers):
            raise ValueError("Идентификаторы не должны быть пустыми")
        if len(set(self.products)) != len(self.products):
            raise ValueError("Идентификаторы продуктов должны быть уникальными")
        if len(set(self.buyers)) != len(self.buyers):
            raise ValueError("Идентификаторы покупателей должны быть уникальными")
        if not set(self.buyer_info).issubset(set(self.buyers)):
            raise ValueError("buyer_info содержит неизвестного покупателя")

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
    delivery_time_margin: float
    spoilage_risk: str


class BuyerProductMetricOutput(BaseModel):
    requested_kg: float
    price_per_kg: float
    potential_revenue: float


class BuyerMetricOutput(BaseModel):
    name: str
    city: str
    distance_km: float
    products: Dict[str, BuyerProductMetricOutput]
    total_potential_revenue: float


class PlanMetricsOutput(BaseModel):
    total_shipped_kg: float
    total_leftovers_kg: float
    total_demand_kg: float
    fulfilled_demand_kg: float
    fulfillment_rate_percent: float
    profit_margin_percent: float


class VehicleMetricOutput(BaseModel):
    model: str
    plate_number: str
    capacity_kg: float
    used_capacity_kg: float
    free_capacity_kg: float
    utilization_percent: float
    available: bool
    used: bool


class RouteMetricOutput(BaseModel):
    vehicle: str
    buyer: str
    buyer_name: str
    city: str
    distance_km: float
    delivery_time: float
    route_cost: float
    shipped_kg: float
    route_revenue: float
    route_profit: float


class OptimizeResponse(BaseModel):
    shipments: List[ShipmentOutput]
    revenue: float
    transport_cost: float
    profit: float
    leftovers: Dict[str, float]
    used_capacity: Dict[str, float]
    buyer_metrics: Dict[str, BuyerMetricOutput]
    plan_metrics: PlanMetricsOutput
    vehicle_metrics: Dict[str, VehicleMetricOutput]
    route_metrics: List[RouteMetricOutput]


class CompareRoutesRequest(OptimizeRequest):
    selected_buyers: List[str] = Field(min_length=1)
    max_solutions: int = Field(default=3, ge=1, le=3)

    @model_validator(mode="after")
    def validate_selected_buyers(self):
        if len(set(self.selected_buyers)) != len(self.selected_buyers):
            raise ValueError("selected_buyers не должен содержать повторов")
        if not set(self.selected_buyers).issubset(set(self.buyers)):
            raise ValueError("selected_buyers содержит неизвестного покупателя")
        return self


class ComparisonSolutionOutput(OptimizeResponse):
    rank: int
    recommended: bool
    buyers_used: List[str]
    vehicles_used: List[str]
    total_delivery_time: float


class CompareRoutesResponse(BaseModel):
    solutions: List[ComparisonSolutionOutput]
    recommended_solution: ComparisonSolutionOutput
    explanation: str
