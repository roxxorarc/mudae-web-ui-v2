"""
Shared fixtures for bot tests.
Mocks discord objects and the supabase client so handlers can be tested
without network access.
"""
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Patch db.database *before* any handler import touches it
# ---------------------------------------------------------------------------
_fake_supabase = MagicMock(name="supabase")
sys.modules.setdefault("db", SimpleNamespace(database=SimpleNamespace(supabase=_fake_supabase)))
sys.modules.setdefault("db.database", SimpleNamespace(supabase=_fake_supabase))


# ---------------------------------------------------------------------------
# Discord mock helpers
# ---------------------------------------------------------------------------
class FakeMember:
    def __init__(self, name: str, user_id: str, display_name: str | None = None, global_name: str | None = None):
        self.id = int(user_id)
        self.name = name
        self.display_name = display_name or name
        self.global_name = global_name or name


class FakeGuild:
    def __init__(self, members: list[FakeMember]):
        self.members = members
        self._by_id = {m.id: m for m in members}

    def get_member(self, member_id: int) -> FakeMember | None:
        return self._by_id.get(member_id)


class FakeChannel:
    def __init__(self, channel_id: str):
        # Discord channel.id is an int; handler compares str(channel.id)
        self.id = int(channel_id) if channel_id.isdigit() else channel_id


class FakeMessage:
    """Minimal stand-in for discord.Message."""
    def __init__(
        self,
        content: str,
        guild: FakeGuild,
        channel_id: str = "111",
        author_id: str = "432610292342587392",  # MUDAE_BOT_ID
        embeds: list | None = None,
    ):
        self.content = content
        self.guild = guild
        self.channel = FakeChannel(channel_id)
        self.author = SimpleNamespace(id=int(author_id))
        self.embeds = embeds or []
        self.partial = False


class FakeEmbed:
    def __init__(self, description: str | None = None, title: str | None = None):
        self.description = description
        self.title = title


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def supabase_mock():
    """Return a fresh MagicMock that replaces supabase in handler .db property."""
    mock = MagicMock(name="supabase")
    with patch("bot.utils.mudae_event_handler.supabase", mock):
        yield mock


def make_db_response(data: list[dict] | None = None):
    """Helper to build a fake supabase response."""
    return SimpleNamespace(data=data or [])
