from datetime import date, datetime

from pydantic import BaseModel


class AdminDashboardTotals(BaseModel):
    users: int
    recipes: int
    reviews: int
    uploads: int
    average_rating: float


class AdminUploadStatusCount(BaseModel):
    status: str
    count: int


class AdminDashboardDay(BaseModel):
    date: date
    users: int
    recipes: int


class AdminRatingCount(BaseModel):
    rating: int
    count: int


class AdminRecentReview(BaseModel):
    id: str
    user_name: str
    user_email: str
    recipe_title: str
    rating: int
    comment: str | None
    created_at: datetime


class AdminRecentUpload(BaseModel):
    id: str
    filename: str
    status: str
    user_name: str
    user_email: str
    created_at: datetime


class AdminRecentRecipe(BaseModel):
    id: str
    title: str
    user_name: str
    user_email: str
    created_at: datetime


class AdminDashboardRead(BaseModel):
    totals: AdminDashboardTotals
    daily_activity: list[AdminDashboardDay]
    rating_distribution: list[AdminRatingCount]
    recent_reviews: list[AdminRecentReview]
    upload_status_counts: list[AdminUploadStatusCount]
    recent_uploads: list[AdminRecentUpload]
    recent_recipes: list[AdminRecentRecipe]
