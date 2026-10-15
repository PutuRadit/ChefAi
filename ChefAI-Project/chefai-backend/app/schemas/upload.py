from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UploadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    width: int
    height: int
    status: str
    created_at: datetime
    expires_at: datetime
