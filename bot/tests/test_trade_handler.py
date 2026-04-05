"""Tests for TradeHandler — single and multi-character trades."""
import pytest
from unittest.mock import call, MagicMock

from bot.utils.trade_handler import TradeHandler
from bot.utils.mudae_event_handler import EventConfig
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage, make_db_response


def _make_handler(channel_id: str = "111") -> TradeHandler:
    return TradeHandler(EventConfig(channel_ids=[channel_id]))


def _guild_with(members: list[FakeMember]) -> FakeGuild:
    return FakeGuild(members)


def _setup_trade_db(supabase_mock, left_data, right_data):
    """Configure supabase mock for a trade: two select calls then two updates."""
    table = supabase_mock.table.return_value

    # .select().in_().execute() — called twice (left chars, right chars)
    select_chain = table.select.return_value.in_.return_value
    select_chain.execute = MagicMock(
        side_effect=[make_db_response(left_data), make_db_response(right_data)]
    )

    # .update().in_().execute() — called twice for the swap
    update_chain = table.update.return_value.in_.return_value
    update_chain.execute.return_value = make_db_response([{}])

    return table


# ---------------------------------------------------------------------------
# Single trade
# ---------------------------------------------------------------------------

class TestSingleTrade:
    @pytest.mark.asyncio
    async def test_simple_1v1_trade(self, supabase_mock):
        guild = _guild_with([
            FakeMember("owner1", "100"),
            FakeMember("owner2", "200"),
        ])
        msg = FakeMessage("🤝 L'échange est terminé : **Char1** vs **Char2**", guild)

        table = _setup_trade_db(
            supabase_mock,
            left_data=[{"name": "Char1", "userId": "100"}],
            right_data=[{"name": "Char2", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        # Two updates: swap owners
        assert table.update.call_count == 2

    @pytest.mark.asyncio
    async def test_trade_swaps_owners(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 L'échange est terminé : **Saber** vs **Rem**", guild)

        table = _setup_trade_db(
            supabase_mock,
            left_data=[{"name": "Saber", "userId": "100"}],
            right_data=[{"name": "Rem", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        # First update: left chars get right owner
        first_update = table.update.call_args_list[0][0][0]
        assert first_update["userId"] == "200"

        # Second update: right chars get left owner
        second_update = table.update.call_args_list[1][0][0]
        assert second_update["userId"] == "100"


# ---------------------------------------------------------------------------
# Multi-character trade
# ---------------------------------------------------------------------------

class TestMultiTrade:
    @pytest.mark.asyncio
    async def test_2v2_trade(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1**, **Char2** vs **Char3**, **Char4** (info)",
            guild,
        )

        table = _setup_trade_db(
            supabase_mock,
            left_data=[
                {"name": "Char1", "userId": "100"},
                {"name": "Char2", "userId": "100"},
            ],
            right_data=[
                {"name": "Char3", "userId": "200"},
                {"name": "Char4", "userId": "200"},
            ],
        )

        handler = _make_handler()
        await handler.handle(msg)

        assert table.update.call_count == 2

    @pytest.mark.asyncio
    async def test_trade_with_et_separator(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1** et **Char2** vs **Char3** et **Char4**",
            guild,
        )

        table = _setup_trade_db(
            supabase_mock,
            left_data=[
                {"name": "Char1", "userId": "100"},
                {"name": "Char2", "userId": "100"},
            ],
            right_data=[
                {"name": "Char3", "userId": "200"},
                {"name": "Char4", "userId": "200"},
            ],
        )

        handler = _make_handler()
        await handler.handle(msg)

        assert table.update.call_count == 2


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestTradeEdgeCases:
    @pytest.mark.asyncio
    async def test_no_match_returns_early(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("random text", guild)

        handler = _make_handler()
        await handler.handle(msg)

        supabase_mock.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_chars_not_in_db_returns_early(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("🤝 L'échange est terminé : **Char1** vs **Char2**", guild)

        _setup_trade_db(supabase_mock, left_data=[], right_data=[])

        handler = _make_handler()
        await handler.handle(msg)

        # select called but no update
        assert supabase_mock.table.return_value.update.call_count == 0

    @pytest.mark.asyncio
    async def test_mixed_owners_on_one_side_returns_false(self, supabase_mock):
        """If chars on one side belong to different users, trade should fail."""
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
            FakeMember("charlie", "300"),
        ])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1**, **Char2** vs **Char3** (info)",
            guild,
        )

        _setup_trade_db(
            supabase_mock,
            left_data=[
                {"name": "Char1", "userId": "100"},
                {"name": "Char2", "userId": "200"},  # different owner!
            ],
            right_data=[{"name": "Char3", "userId": "300"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        # Should not update because left side has mixed owners
        assert supabase_mock.table.return_value.update.call_count == 0

    @pytest.mark.asyncio
    async def test_wrong_channel_skipped(self, supabase_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1** vs **Char2**",
            guild,
            channel_id="wrong",
        )

        handler = _make_handler(channel_id="111")
        await handler.process(msg)

        supabase_mock.table.assert_not_called()

    @pytest.mark.asyncio
    async def test_curly_apostrophe_trade(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 L\u2019échange est terminé : **Saber** vs **Rem**", guild)

        table = _setup_trade_db(
            supabase_mock,
            left_data=[{"name": "Saber", "userId": "100"}],
            right_data=[{"name": "Rem", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        assert table.update.call_count == 2


# ---------------------------------------------------------------------------
# English trade
# ---------------------------------------------------------------------------

class TestEnglishTrade:
    @pytest.mark.asyncio
    async def test_english_1v1_trade(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 The trade is done: **Char1** vs **Char2**", guild)

        table = _setup_trade_db(
            supabase_mock,
            left_data=[{"name": "Char1", "userId": "100"}],
            right_data=[{"name": "Char2", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        assert table.update.call_count == 2

    @pytest.mark.asyncio
    async def test_english_exchange_is_over_trade(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 The exchange is over: **Char1** vs **Char2**", guild)

        table = _setup_trade_db(
            supabase_mock,
            left_data=[{"name": "Char1", "userId": "100"}],
            right_data=[{"name": "Char2", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        assert table.update.call_count == 2

    @pytest.mark.asyncio
    async def test_english_multi_trade_with_and(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage(
            "🤝 The trade is done: **Char1** and **Char2** vs **Char3** and **Char4**",
            guild,
        )

        table = _setup_trade_db(
            supabase_mock,
            left_data=[
                {"name": "Char1", "userId": "100"},
                {"name": "Char2", "userId": "100"},
            ],
            right_data=[
                {"name": "Char3", "userId": "200"},
                {"name": "Char4", "userId": "200"},
            ],
        )

        handler = _make_handler()
        await handler.handle(msg)

        assert table.update.call_count == 2

    @pytest.mark.asyncio
    async def test_english_trade_swaps_owners(self, supabase_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 The trade is done: **Saber** vs **Rem**", guild)

        table = _setup_trade_db(
            supabase_mock,
            left_data=[{"name": "Saber", "userId": "100"}],
            right_data=[{"name": "Rem", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        first_update = table.update.call_args_list[0][0][0]
        assert first_update["userId"] == "200"
        second_update = table.update.call_args_list[1][0][0]
        assert second_update["userId"] == "100"
