"""Tests for MarriageHandler."""
import pytest

from bot.utils.marriage_handler import MarriageHandler
from bot.utils.mudae_event_handler import EventConfig
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage


def _make_handler(channel_id: str = "111") -> MarriageHandler:
    return MarriageHandler(EventConfig(channel_ids=[channel_id]))


def _guild_with(members: list[FakeMember]) -> FakeGuild:
    return FakeGuild(members)


# ---------------------------------------------------------------------------
# French marriage
# ---------------------------------------------------------------------------

class TestFrenchMarriage:
    @pytest.mark.asyncio
    async def test_standard_marriage(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("💖 **alice** et **Saber** sont maintenant mariés ! 💖", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Saber"]
        assert user_id == "100"

    @pytest.mark.asyncio
    async def test_marriage_character_not_in_guild(self, repo_mock):
        """Character name must NOT resolve as a guild member."""
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("💖 **alice** et **Saber** sont maintenant mariés ! 💖", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Saber"]
        assert user_id == "100"


# ---------------------------------------------------------------------------
# English marriage
# ---------------------------------------------------------------------------

class TestEnglishMarriage:
    @pytest.mark.asyncio
    async def test_english_marriage(self, repo_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("💖 bob and Rem are now married! 💖", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Rem"]
        assert user_id == "200"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestMarriageEdgeCases:
    @pytest.mark.asyncio
    async def test_no_match_returns_early(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("some random text", guild)

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_both_names_are_members_returns_early(self, repo_mock):
        """If both matched names are guild members, we can't tell who's the character."""
        guild = _guild_with([FakeMember("alice", "100"), FakeMember("bob", "200")])
        msg = FakeMessage("💖 **alice** et **bob** sont maintenant mariés ! 💖", guild)

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_neither_name_is_member_returns_early(self, repo_mock):
        guild = _guild_with([])
        msg = FakeMessage("💖 **unknown1** et **unknown2** sont maintenant mariés ! 💖", guild)

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_wrong_channel_skipped(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("💖 **alice** et **Saber** sont maintenant mariés ! 💖", guild, channel_id="wrong")

        handler = _make_handler(channel_id="111")
        await handler.process(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_non_mudae_author_skipped(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage(
            "💖 **alice** et **Saber** sont maintenant mariés ! 💖",
            guild,
            author_id="999",
        )

        handler = _make_handler()
        await handler.process(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_character_not_found_in_db(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("💖 **alice** et **Saber** sont maintenant mariés ! 💖", guild)

        repo_mock.set_owner_by_names.return_value = 0

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.set_owner_by_names.assert_awaited_once()
