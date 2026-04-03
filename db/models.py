from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class UserProfile(BaseModel):
    id: uuid.UUID
    discordId: str
    discordUsername: Optional[str] = None
    discordDiscriminator: Optional[str] = None
    discordAvatar: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Character(BaseModel):
    characterId: int
    userId: Optional[str] = None
    name: str
    series: str
    imageUrl: str
    kakeraValue: int
    addedAt: datetime
    claimedAt: Optional[datetime] = None
    displayOrder: int = 0
    orderUpdatedAt: Optional[datetime] = None

class Wishlist(BaseModel):
    id: Optional[int] = None
    userId: str
    characterId: int
    addedAt: Optional[datetime] = None
    notes: Optional[str] = None
