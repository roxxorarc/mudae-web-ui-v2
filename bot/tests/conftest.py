"""
Shared fixtures for bot tests.
Mocks discord objects and the data layer (db.repository) so handlers can be
tested without network or database access.
"""
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

# Must be set before db.pool is imported (handlers import db.repository).
# The pool is created lazily (open=False) so no connection is attempted.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")

import db.repository as repository  # noqa: E402


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
_REPO_FUNCTIONS = [
    "get_character",
    "list_characters",
    "list_user_characters",
    "get_characters_by_names",
    "find_characters_ilike",
    "upsert_character",
    "update_character",
    "set_owner_by_names",
    "clear_owner",
    "swap_owners",
    "set_display_order",
    "list_zero_kakera_characters",
    "get_user_profile",
    "ensure_user_profile",
    "upsert_user_profile",
]


@pytest.fixture()
def repo_mock(monkeypatch):
    """Replace every db.repository function used by the bot with an AsyncMock.

    Handlers call `repository.<fn>(...)` (module attribute lookup at call
    time), so patching the module attributes covers all of them.
    """
    mock = SimpleNamespace()
    for name in _REPO_FUNCTIONS:
        fn = AsyncMock(name=f"repository.{name}")
        setattr(mock, name, fn)
        monkeypatch.setattr(repository, name, fn)

    # Sensible defaults matching common test setups
    mock.ensure_user_profile.return_value = False  # profile already existed
    mock.get_character.return_value = None
    mock.get_characters_by_names.return_value = []
    mock.find_characters_ilike.return_value = []
    mock.set_owner_by_names.return_value = 1
    mock.clear_owner.return_value = 1
    mock.update_character.return_value = 1
    return mock
