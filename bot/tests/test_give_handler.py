"""Tests for GiveHandler."""
import pytest

from bot.utils.give_handler import GiveHandler
from bot.utils.mudae_event_handler import EventConfig
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage, make_db_response


def _make_handler(channel_id: str = "111") -> GiveHandler:
    return GiveHandler(EventConfig(channel_ids=[channel_id]))


def _guild_with(members: list[FakeMember]) -> FakeGuild:
    return FakeGuild(members)


class TestGiveHandler:
    @pytest.mark.asyncio
    async def test_give_updates_character(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100"), FakeMember("bob", "200")])
        msg = FakeMessage("**Saber** donné à <@200>", guild)

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.execute.return_value = make_db_response([{"name": "Saber"}])

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_called_with("Characters")
        update_args = table.update.call_args[0][0]
        assert update_args["userId"] == "200"

    @pytest.mark.asyncio
    async def test_give_with_exclamation_mention(self, supabase_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Rem** donné à <@!200>", guild)

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.execute.return_value = make_db_response([{"name": "Rem"}])

        handler = _make_handler()
        await handler.handle(msg)

        update_args = table.update.call_args[0][0]
        assert update_args["userId"] == "200"

    @pytest.mark.asyncio
    async def test_no_match_returns_early(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("some random message", guild)

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_character_not_found_in_db(self, supabase_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Unknown** donné à <@200>", guild)

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.execute.return_value = make_db_response([])

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_called_with("Characters")

    @pytest.mark.asyncio
    async def test_wrong_channel_skipped(self, supabase_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Saber** donné à <@200>", guild, channel_id="wrong")

        handler = _make_handler(channel_id="111")
        await handler.process(msg)

        supabase_mock.table.assert_not_called()


class TestEnglishGive:
    @pytest.mark.asyncio
    async def test_english_give(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100"), FakeMember("bob", "200")])
        msg = FakeMessage("**Saber** given to <@200>", guild)

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.execute.return_value = make_db_response([{"name": "Saber"}])

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_called_with("Characters")
        update_args = table.update.call_args[0][0]
        assert update_args["userId"] == "200"

    @pytest.mark.asyncio
    async def test_english_give_with_exclamation_mention(self, supabase_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage("**Rem** given to <@!200>", guild)

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.execute.return_value = make_db_response([{"name": "Rem"}])

        handler = _make_handler()
        await handler.handle(msg)

        update_args = table.update.call_args[0][0]
        assert update_args["userId"] == "200"
