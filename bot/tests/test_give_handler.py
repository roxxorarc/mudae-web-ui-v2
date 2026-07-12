"""Tests for GiveHandler."""
import pytest

from bot.utils.give_handler import GiveHandler
from bot.utils.mudae_event_handler import EventConfig
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage


def _make_handler(channel_id: str = "111") -> GiveHandler:
    return GiveHandler(EventConfig(channel_ids=[channel_id]))


def _guild_with(members: list[FakeMember]) -> FakeGuild:
    return FakeGuild(members)


class TestGiveHandler:
    @pytest.mark.asyncio
    async def test_give_updates_character(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100"), FakeMember("bob", "200")])
        msg = FakeMessage("**Saber** donné à <@200>", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Saber"]
        assert user_id == "200"

    @pytest.mark.asyncio
    async def test_give_with_exclamation_mention(self, repo_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Rem** donné à <@!200>", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Rem"]
        assert user_id == "200"

    @pytest.mark.asyncio
    async def test_no_match_returns_early(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("some random message", guild)

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_character_not_found_in_db(self, repo_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Unknown** donné à <@200>", guild)

        repo_mock.set_owner_by_names.return_value = 0

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.set_owner_by_names.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_wrong_channel_skipped(self, repo_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Saber** donné à <@200>", guild, channel_id="wrong")

        handler = _make_handler(channel_id="111")
        await handler.process(msg)

        repo_mock.set_owner_by_names.assert_not_awaited()


class TestEnglishGive:
    @pytest.mark.asyncio
    async def test_english_give(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100"), FakeMember("bob", "200")])
        msg = FakeMessage("**Saber** given to <@200>", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Saber"]
        assert user_id == "200"

    @pytest.mark.asyncio
    async def test_english_give_with_exclamation_mention(self, repo_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Rem** given to <@!200>", guild)

        handler = _make_handler()
        await handler.handle(msg)

        names, user_id, _ = repo_mock.set_owner_by_names.await_args[0]
        assert names == ["Rem"]
        assert user_id == "200"
