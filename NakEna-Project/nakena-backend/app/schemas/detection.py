from pydantic import BaseModel, Field


class IngredientDetection(BaseModel):
    name: str
    confidence: float = Field(ge=0, le=1)
    box: list[float] = Field(min_length=4, max_length=4)


class IngredientDetectionResponse(BaseModel):
    upload_id: str
    status: str
    ingredients: list[str]
    detections: list[IngredientDetection]
