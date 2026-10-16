"""Минимальный FastAPI-интерфейс оптимизатора поставок."""

from fastapi import FastAPI, HTTPException

from backend.optimizer import optimize_shipments
from backend.schemas import OptimizeRequest, OptimizeResponse


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
