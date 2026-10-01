"""
Pydantic schemas for request / response validation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Annotated


class PredictRequest(BaseModel):
    location: str = Field(..., description="Area/neighbourhood name, e.g. 'Whitefield'")
    total_sqft: Annotated[float, Field(gt=100, lt=50000, description="Total built-up area in sq. ft.")]
    bhk: Annotated[int, Field(ge=1, le=20, description="Number of bedrooms")]
    bathrooms: Annotated[int, Field(ge=1, le=20, description="Number of bathrooms")]

    @field_validator("location")
    @classmethod
    def location_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("location must not be blank")
        return v.strip().lower()


class PredictResponse(BaseModel):
    estimated_price: float = Field(..., description="Predicted price in Indian Rupees Lakhs")
    price_low: float       = Field(..., description="Lower bound of ±10% confidence band (Lakhs)")
    price_high: float      = Field(..., description="Upper bound of ±10% confidence band (Lakhs)")
    location: str
    total_sqft: float
    bhk: int
    bathrooms: int


class LocationsResponse(BaseModel):
    locations: list[str]
