from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Session:
    user_id: str
    channel_id: str
    started_at: datetime = field(default_factory=datetime.now)
    characters_count: int = 0


active_sessions: dict[str, Session] = {}
