"""Tests for DivorceHandler — single and multi-character divorces."""
import pytest
from unittest.mock import call

from bot.utils.divorce_handler import DivorceHandler
from bot.utils.mudae_event_handler import EventConfig
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage, make_db_response


def _make_handler(channel_id: str = "111") -> DivorceHandler:
    return DivorceHandler(EventConfig(channel_ids=[channel_id]))


def _guild_with(members: list[FakeMember]) -> FakeGuild:
    return FakeGuild(members)


# ---------------------------------------------------------------------------
# Single divorce
# ---------------------------------------------------------------------------

class TestSingleDivorce:
    @pytest.mark.asyncio
    async def test_single_character_divorce(self, supabase_mock):
        guild = _guild_with([FakeMember("username", "100")])
        msg = FakeMessage(
            "💔 **Lin Xue Ya** et **username** sont maintenant divorcés. 💔 (+**35**<:kakera:469835869059153940>)",
            guild,
        )

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "Lin Xue Ya"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_called_with("Characters")
        update_args = table.update.call_args[0][0]
        assert update_args["userId"] is None
        assert update_args["claimedAt"] is None

    @pytest.mark.asyncio
    async def test_divorce_clears_user_and_date(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("💔 **Saber** et **alice** sont maintenant divorcés. 💔", guild)

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "Saber"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        update_args = table.update.call_args[0][0]
        assert update_args["userId"] is None
        assert update_args["claimedAt"] is None


# ---------------------------------------------------------------------------
# Multi-character divorce
# ---------------------------------------------------------------------------

class TestMultiDivorce:
    @pytest.mark.asyncio
    async def test_two_characters_divorced(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage(
            "💔 **Char1**, **Char2** et **alice** sont maintenant divorcés. 💔",
            guild,
        )

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "Char1"}, {"name": "Char2"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        # Should pass both character names to in_()
        in_call_args = table.update.return_value.eq.return_value.in_.call_args
        assert "Char1" in in_call_args[0][1]
        assert "Char2" in in_call_args[0][1]

    @pytest.mark.asyncio
    async def test_three_characters_divorced(self, supabase_mock):
        guild = _guild_with([FakeMember("bob", "200")])
        msg = FakeMessage(
            "💔 **A**, **B**, **C** et **bob** sont maintenant divorcés. 💔",
            guild,
        )

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "A"}, {"name": "B"}, {"name": "C"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        in_call_args = table.update.return_value.eq.return_value.in_.call_args
        chars = in_call_args[0][1]
        assert set(chars) == {"A", "B", "C"}


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestDivorceEdgeCases:
    @pytest.mark.asyncio
    async def test_dotuser_divorce(self, supabase_mock):
        """Users with leading dots should be handled."""
        guild = _guild_with([FakeMember(".dotuser", "300")])
        msg = FakeMessage(
            "💔 **Char1**, **Char2** et **.dotuser** sont maintenant divorcés. 💔",
            guild,
        )

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "Char1"}, {"name": "Char2"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_called_with("Characters")

    @pytest.mark.asyncio
    async def test_no_match_returns_early(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("some random text", guild)

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_user_not_in_guild_returns_early(self, supabase_mock):
        """If the username in the divorce message isn't a guild member, skip."""
        guild = _guild_with([])
        msg = FakeMessage(
            "💔 **Saber** et **unknownuser** sont maintenant divorcés. 💔",
            guild,
        )

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_wrong_channel_skipped(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage(
            "💔 **Saber** et **alice** sont maintenant divorcés. 💔",
            guild,
            channel_id="wrong",
        )

        handler = _make_handler(channel_id="111")
        await handler.process(msg)

        supabase_mock.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_divorce_confirmation_not_matched(self, supabase_mock):
        """The confirmation prompt should NOT trigger the divorce handler."""
        guild = _guild_with([FakeMember("username", "100")])
        msg = FakeMessage(
            "**Lin Xue Ya**: Confirmez-vous le divorce ? (o/n)\n\nLes personnages divorcés par $divorce sont aussi e",
            guild,
        )

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_not_called()


# ---------------------------------------------------------------------------
# English divorce
# ---------------------------------------------------------------------------

class TestEnglishDivorce:
    @pytest.mark.asyncio
    async def test_english_single_divorce(self, supabase_mock):
        guild = _guild_with([FakeMember("username", "100")])
        msg = FakeMessage(
            "💔 Char1 and username are now divorced. 💔 (+24:kakera:)",
            guild,
        )

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "Char1"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_called_with("Characters")
        update_args = table.update.call_args[0][0]
        assert update_args["userId"] is None

    @pytest.mark.asyncio
    async def test_english_multi_divorce(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage(
            "💔 **Char1**, **Char2** and **alice** are now divorced. 💔",
            guild,
        )

        table = supabase_mock.table.return_value
        table.update.return_value.eq.return_value.in_.return_value.execute.return_value = make_db_response(
            [{"name": "Char1"}, {"name": "Char2"}]
        )

        handler = _make_handler()
        await handler.handle(msg)

        in_call_args = table.update.return_value.eq.return_value.in_.call_args
        assert "Char1" in in_call_args[0][1]
        assert "Char2" in in_call_args[0][1]

    @pytest.mark.asyncio
    async def test_english_confirmation_not_matched(self, supabase_mock):
        """The English confirmation prompt should NOT trigger the handler."""
        guild = _guild_with([FakeMember("username", "100")])
        msg = FakeMessage(
            "Char1: Do you confirm the divorce? (y/n/yes/no)\nCharacters divorced by $divorce are also removed",
            guild,
        )

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_not_called()
