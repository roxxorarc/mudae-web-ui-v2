"""Tests for the base MudaeEventHandler class."""
import pytest
from unittest.mock import patch

from bot.utils.mudae_event_handler import MudaeEventHandler, EventConfig, ensure_user_profile
from bot.tests.conftest import FakeMember, FakeGuild, FakeMessage, FakeEmbed


class _StubHandler(MudaeEventHandler):
    """Concrete subclass for testing the abstract base."""
    def __init__(self, config: EventConfig):
        super().__init__(config)
        self.handled = False

    async def handle(self, message) -> None:
        self.handled = True


class TestEnsureUserProfile:
    @pytest.mark.asyncio
    async def test_returns_true_if_profile_exists(self, repo_mock):
        repo_mock.ensure_user_profile.return_value = False  # nothing inserted

        assert await ensure_user_profile("100", "alice") is True
        repo_mock.ensure_user_profile.assert_awaited_once_with("100", "alice")

    @pytest.mark.asyncio
    async def test_creates_and_returns_true_if_profile_missing(self, repo_mock):
        repo_mock.ensure_user_profile.return_value = True  # row inserted

        assert await ensure_user_profile("100", "alice") is True

    @pytest.mark.asyncio
    async def test_returns_false_if_upsert_raises(self, repo_mock):
        repo_mock.ensure_user_profile.side_effect = Exception("boom")

        assert await ensure_user_profile("100", "alice") is False

    @pytest.mark.asyncio
    async def test_returns_false_for_empty_user_id(self, repo_mock):
        assert await ensure_user_profile("", "alice") is False
        repo_mock.ensure_user_profile.assert_not_awaited()


class TestExtractTextSources:
    def test_content_only(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        msg = FakeMessage("hello", FakeGuild([]))
        assert handler.extract_text_sources(msg) == ["hello"]

    def test_embed_description_and_title(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        msg = FakeMessage("", FakeGuild([]), embeds=[FakeEmbed(description="desc", title="title")])
        msg.content = ""
        sources = handler.extract_text_sources(msg)
        assert "desc" in sources
        assert "title" in sources

    def test_empty_message(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        msg = FakeMessage("", FakeGuild([]))
        msg.content = ""
        assert handler.extract_text_sources(msg) == []


class TestCleanName:
    def test_strips_bold(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.clean_name("**Saber**") == "Saber"

    def test_preserves_leading_dot(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.clean_name("**.dotuser**") == ".dotuser"

    def test_strips_leading_special_chars(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.clean_name("💔Saber") == "Saber"

    def test_strips_whitespace(self):
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.clean_name("  Saber  ") == "Saber"


class TestFindMemberByName:
    def test_finds_by_name(self):
        guild = FakeGuild([FakeMember("alice", "100")])
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.find_member_by_name(guild, "alice") == "100"

    def test_case_insensitive(self):
        guild = FakeGuild([FakeMember("Alice", "100")])
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.find_member_by_name(guild, "alice") == "100"

    def test_finds_by_display_name(self):
        guild = FakeGuild([FakeMember("alice", "100", display_name="AliceDisplay")])
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.find_member_by_name(guild, "AliceDisplay") == "100"

    def test_finds_by_global_name(self):
        guild = FakeGuild([FakeMember("alice", "100", global_name="AliceGlobal")])
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.find_member_by_name(guild, "AliceGlobal") == "100"

    def test_returns_none_for_unknown(self):
        guild = FakeGuild([FakeMember("alice", "100")])
        handler = _StubHandler(EventConfig(channel_ids=[]))
        assert handler.find_member_by_name(guild, "unknown") is None

    def test_member_lookup_has_no_side_effects(self):
        guild = FakeGuild([FakeMember("alice", "100")])
        handler = _StubHandler(EventConfig(channel_ids=[]))

        with patch("bot.utils.mudae_event_handler.ensure_user_profile") as ensure_mock:
            assert handler.find_member_by_name(guild, "alice") == "100"

        ensure_mock.assert_not_called()


class TestProcess:
    @pytest.mark.asyncio
    async def test_wrong_channel_skips(self):
        handler = _StubHandler(EventConfig(channel_ids=["111"]))
        msg = FakeMessage("test", FakeGuild([]), channel_id="999")

        await handler.process(msg)
        assert not handler.handled

    @pytest.mark.asyncio
    async def test_non_mudae_author_skips(self):
        handler = _StubHandler(EventConfig(channel_ids=["111"]))
        msg = FakeMessage("test", FakeGuild([]), author_id="999")

        await handler.process(msg)
        assert not handler.handled

    @pytest.mark.asyncio
    async def test_valid_message_calls_handle(self):
        handler = _StubHandler(EventConfig(channel_ids=["111"]))
        msg = FakeMessage("test", FakeGuild([]))

        await handler.process(msg)
        assert handler.handled
