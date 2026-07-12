"""Tests for TradeHandler — single and multi-character trades."""
import pytest

from bot.utils.trade_handler import TradeHandler
from bot.utils.mudae_event_handler import EventConfig
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage


def _make_handler(channel_id: str = "111") -> TradeHandler:
    return TradeHandler(EventConfig(channel_ids=[channel_id]))


def _guild_with(members: list[FakeMember]) -> FakeGuild:
    return FakeGuild(members)


def _setup_trade_db(repo_mock, left_data, right_data):
    """Configure the repository mock for a trade: two name lookups then a swap."""
    repo_mock.get_characters_by_names.side_effect = [left_data, right_data]


# ---------------------------------------------------------------------------
# Single trade
# ---------------------------------------------------------------------------

class TestSingleTrade:
    @pytest.mark.asyncio
    async def test_simple_1v1_trade(self, repo_mock):
        guild = _guild_with([
            FakeMember("owner1", "100"),
            FakeMember("owner2", "200"),
        ])
        msg = FakeMessage("🤝 L'échange est terminé : **Char1** vs **Char2**", guild)

        _setup_trade_db(
            repo_mock,
            left_data=[{"name": "Char1", "userId": "100"}],
            right_data=[{"name": "Char2", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.swap_owners.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_trade_swaps_owners(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 L'échange est terminé : **Saber** vs **Rem**", guild)

        _setup_trade_db(
            repo_mock,
            left_data=[{"name": "Saber", "userId": "100"}],
            right_data=[{"name": "Rem", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        args = repo_mock.swap_owners.await_args[0]
        left_names, left_new_owner, right_names, right_new_owner = args[:4]
        # Left chars go to the right owner and vice versa
        assert left_names == ["Saber"]
        assert left_new_owner == "200"
        assert right_names == ["Rem"]
        assert right_new_owner == "100"


# ---------------------------------------------------------------------------
# Multi-character trade
# ---------------------------------------------------------------------------

class TestMultiTrade:
    @pytest.mark.asyncio
    async def test_2v2_trade(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1**, **Char2** vs **Char3**, **Char4** (info)",
            guild,
        )

        _setup_trade_db(
            repo_mock,
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

        args = repo_mock.swap_owners.await_args[0]
        assert set(args[0]) == {"Char1", "Char2"}
        assert set(args[2]) == {"Char3", "Char4"}

    @pytest.mark.asyncio
    async def test_trade_with_et_separator(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1** et **Char2** vs **Char3** et **Char4**",
            guild,
        )

        _setup_trade_db(
            repo_mock,
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

        repo_mock.swap_owners.assert_awaited_once()


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestTradeEdgeCases:
    @pytest.mark.asyncio
    async def test_no_match_returns_early(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("random text", guild)

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.get_characters_by_names.assert_not_awaited()
        repo_mock.swap_owners.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_chars_not_in_db_returns_early(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage("🤝 L'échange est terminé : **Char1** vs **Char2**", guild)

        _setup_trade_db(repo_mock, left_data=[], right_data=[])

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.swap_owners.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_mixed_owners_on_one_side_returns_false(self, repo_mock):
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
            repo_mock,
            left_data=[
                {"name": "Char1", "userId": "100"},
                {"name": "Char2", "userId": "200"},  # different owner!
            ],
            right_data=[{"name": "Char3", "userId": "300"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.swap_owners.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_wrong_channel_skipped(self, repo_mock):
        guild = _guild_with([FakeMember("alice", "100")])
        msg = FakeMessage(
            "🤝 L'échange est terminé : **Char1** vs **Char2**",
            guild,
            channel_id="wrong",
        )

        handler = _make_handler(channel_id="111")
        await handler.process(msg)

        repo_mock.get_characters_by_names.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_curly_apostrophe_trade(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 L’échange est terminé : **Saber** vs **Rem**", guild)

        _setup_trade_db(
            repo_mock,
            left_data=[{"name": "Saber", "userId": "100"}],
            right_data=[{"name": "Rem", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.swap_owners.assert_awaited_once()


# ---------------------------------------------------------------------------
# English trade
# ---------------------------------------------------------------------------

class TestEnglishTrade:
    @pytest.mark.asyncio
    async def test_english_1v1_trade(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 The trade is done: **Char1** vs **Char2**", guild)

        _setup_trade_db(
            repo_mock,
            left_data=[{"name": "Char1", "userId": "100"}],
            right_data=[{"name": "Char2", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.swap_owners.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_english_exchange_is_over_trade(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 The exchange is over: **Char1** vs **Char2**", guild)

        _setup_trade_db(
            repo_mock,
            left_data=[{"name": "Char1", "userId": "100"}],
            right_data=[{"name": "Char2", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        repo_mock.swap_owners.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_english_multi_trade_with_and(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage(
            "🤝 The trade is done: **Char1** and **Char2** vs **Char3** and **Char4**",
            guild,
        )

        _setup_trade_db(
            repo_mock,
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

        repo_mock.swap_owners.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_english_trade_swaps_owners(self, repo_mock):
        guild = _guild_with([
            FakeMember("alice", "100"),
            FakeMember("bob", "200"),
        ])
        msg = FakeMessage("🤝 The trade is done: **Saber** vs **Rem**", guild)

        _setup_trade_db(
            repo_mock,
            left_data=[{"name": "Saber", "userId": "100"}],
            right_data=[{"name": "Rem", "userId": "200"}],
        )

        handler = _make_handler()
        await handler.handle(msg)

        args = repo_mock.swap_owners.await_args[0]
        assert args[0] == ["Saber"]
        assert args[1] == "200"
        assert args[2] == ["Rem"]
        assert args[3] == "100"
