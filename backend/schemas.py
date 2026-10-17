"""Pydantic-схемы HTTP API оптимизатора."""

from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field, model_validator


class VehicleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    capacity: float = Field(ge=0, allow_inf_nan=False)
    cost: float = Field(ge=0, allow_inf_nan=False)
    available: bool
    speed_kmh: float = Field(gt=0, allow_inf_nan=False)
    cost_per_km: float = Field(ge=0, allow_inf_nan=False)
    route_base_cost: float = Field(default=0, ge=0, allow_inf_nan=False)
    model: str = ""
    plate_number: str = ""
    refrigeration_hours: float = Field(default=0, ge=0, allow_inf_nan=False)


class BuyerInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    city: str
    distance_km: float = Field(ge=0, allow_inf_nan=False)
    coordinates: Tuple[float, float]


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    products: List[str] = Field(min_length=1)
    buyers: List[str] = Field(min_length=1)
    stock: Dict[str, float]
    demand: Dict[str, Dict[str, float]]
    prices: Dict[str, Dict[str, float]]
    vehicles: Dict[str, VehicleInput] = Field(min_length=1)
    max_delivery_time: Dict[str, float]
    farm_location: Optional[str] = None
    farm_coordinates: Tuple[float, float]
    buyer_info: Dict[str, BuyerInfoInput]

    @model_validator(mode="after")
    def validate_related_keys_and_values(self):
        if any(not item.strip() for item in self.products + self.buyers):
            raise ValueError("Идентификаторы не должны быть пустыми")
        if len(set(self.products)) != len(self.products) or len(set(self.buyers)) != len(self.buyers):
            raise ValueError("Идентификаторы продуктов и покупателей должны быть уникальными")
        products, buyers = set(self.products), set(self.buyers)
        if any(set(getattr(self, field)) != products for field in ("stock", "demand", "prices", "max_delivery_time")):
            raise ValueError("Поля продуктов должны содержать все и только указанные продукты")
        if set(self.buyer_info) != buyers:
            raise ValueError("buyer_info должен содержать всех покупателей")
        for product in self.products:
            if set(self.demand[product]) != buyers or set(self.prices[product]) != buyers:
                raise ValueError(f"demand.{product} и prices.{product} должны содержать всех покупателей")
        return self


class ShipmentOutput(BaseModel):
    product: str
    buyer: str
    vehicle: str
    itinerary_id: str
    stop_order: int
    quantity: float
    arrival_time: float
    delivery_time_margin: float
    spoilage_risk: str


class UnloadOutput(BaseModel):
    product: str
    quantity: float
    delivery_time_margin: float
    spoilage_risk: str


class ItineraryStopOutput(BaseModel):
    order: int
    buyer: str
    buyer_name: str
    city: str
    coordinates: Tuple[float, float]
    leg_distance_km: float
    distance_km: float
    arrival_time: float
    unloads: List[UnloadOutput]


class ItineraryOutput(BaseModel):
    id: str
    vehicle: str
    ordered_stops: List[ItineraryStopOutput]
    total_distance_km: float
    total_time: float
    total_load_kg: float
    itinerary_cost: float
    fixed_vehicle_cost: float
    revenue: float
    contribution_before_fixed_cost: float
    refrigeration_hours: float
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
    itinerary_id: str
    vehicle: str
    buyers: List[str]
    buyer_names: List[str]
    cities: List[str]
    distance_km: float
    delivery_time: float
    route_cost: float
    shipped_kg: float
    route_revenue: float
    route_profit: float


class OptimizeResponse(BaseModel):
    shipments: List[ShipmentOutput]
    itineraries: List[ItineraryOutput]
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
