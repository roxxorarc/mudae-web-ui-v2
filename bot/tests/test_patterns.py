"""Tests for regex patterns in bot.utils.patterns."""
import pytest
from bot.utils.patterns import (
    MARRIAGE_PATTERNS,
    DIVORCE_PATTERN,
    TRADE_PATTERN,
    GIVE_PATTERN,
    CHARACTER_PATTERNS,
)

# ============================================================================
# Marriage patterns
# ============================================================================

class TestMarriagePatterns:
    @pytest.mark.parametrize("text", [
        "💖 alice et Saber sont maintenant mariés ! 💖",
        "💞 alice et Saber sont maintenant mariés !",
        "alice et Saber sont maintenant mariés !",
        "💖 alice et Saber sont maintenant mariés!💖",
    ])
    def test_french_marriage(self, text):
        assert any(p.search(text) for p in MARRIAGE_PATTERNS)

    @pytest.mark.parametrize("text", [
        "💖 alice and Saber are now married! 💖",
        "alice & Saber are now married!",
        "alice and Saber are now married!",
    ])
    def test_english_marriage(self, text):
        assert any(p.search(text) for p in MARRIAGE_PATTERNS)

    def test_heart_shorthand(self):
        assert any(p.search("alice ❤️ Saber") for p in MARRIAGE_PATTERNS)

    def test_married_to_format(self):
        assert any(p.search("alice married to Saber") for p in MARRIAGE_PATTERNS)

    def test_capture_groups(self):
        text = "💖 alice et Saber sont maintenant mariés ! 💖"
        for p in MARRIAGE_PATTERNS:
            m = p.search(text)
            if m:
                assert "alice" in m.group(1)
                assert "Saber" in m.group(2)
                break
        else:
            pytest.fail("No pattern matched")

    def test_no_false_positive_on_divorce(self):
        text = "💔 Saber et alice sont maintenant divorcés. 💔"
        assert not any(p.search(text) for p in MARRIAGE_PATTERNS)


# ============================================================================
# Divorce pattern
# ============================================================================

class TestDivorcePattern:
    def test_single_divorce(self):
        text = "💔 **Lin Xue Ya** et **username** sont maintenant divorcés. 💔 (+**35**<:kakera:469835869059153940>)"
        m = DIVORCE_PATTERN.search(text)
        assert m is not None

    def test_multi_divorce(self):
        text = "💔 **Char1**, **Char2** et **someuser** sont maintenant divorcés. 💔"
        m = DIVORCE_PATTERN.search(text)
        assert m is not None
        raw = m.group(1).replace("**", "")
        assert "Char1" in raw
        assert "Char2" in raw
        assert "someuser" in raw

    def test_no_emoji_prefix(self):
        text = "**Char1** et **user** sont maintenant divorcés."
        assert DIVORCE_PATTERN.search(text)

    def test_dotuser_divorce(self):
        text = "💔 **Char1**, **Char2** et **.dotuser** sont maintenant divorcés. 💔"
        m = DIVORCE_PATTERN.search(text)
        assert m is not None
        assert ".dotuser" in m.group(1)

    # --- English ---

    def test_english_single_divorce(self):
        text = "💔 Char1 and username are now divorced. 💔 (+24:kakera:)"
        m = DIVORCE_PATTERN.search(text)
        assert m is not None

    def test_english_single_divorce_captures(self):
        text = "💔 **Char1** and **username** are now divorced. 💔 (+24:kakera:)"
        m = DIVORCE_PATTERN.search(text)
        assert m is not None
        raw = m.group(1).replace("**", "")
        assert "Char1" in raw
        assert "username" in raw

    def test_english_multi_divorce(self):
        text = "💔 **Char1**, **Char2** and **someuser** are now divorced. 💔"
        m = DIVORCE_PATTERN.search(text)
        assert m is not None
        raw = m.group(1).replace("**", "")
        assert "Char1" in raw
        assert "Char2" in raw
        assert "someuser" in raw

    def test_english_no_emoji_prefix(self):
        text = "**Saber** and **alice** are now divorced."
        assert DIVORCE_PATTERN.search(text)

    def test_english_divorce_confirmation_not_matched(self):
        """The English confirmation prompt should NOT trigger the divorce pattern."""
        text = "Char1: Do you confirm the divorce? (y/n/yes/no)"
        assert DIVORCE_PATTERN.search(text) is None

    def test_no_false_positive_on_english_marriage(self):
        text = "💖 username and Char1 are now married! 💖"
        assert DIVORCE_PATTERN.search(text) is None


# ============================================================================
# Trade pattern
# ============================================================================

class TestTradePattern:
    def test_single_trade(self):
        text = "🤝 L'échange est terminé : **Char1** vs **Char2**"
        m = TRADE_PATTERN.search(text)
        assert m is not None

    def test_trade_with_apostrophe_variant(self):
        text = "🤝 L\u2019échange est terminé : **Char1** vs **Char2**"
        m = TRADE_PATTERN.search(text)
        assert m is not None

    def test_multi_trade(self):
        text = "🤝 L'échange est terminé : **Char1**, **Char2** vs **Char3**, **Char4** (info)"
        m = TRADE_PATTERN.search(text)
        assert m is not None

    def test_capture_groups(self):
        text = "🤝 L'échange est terminé : **Saber** vs **Rem**"
        m = TRADE_PATTERN.search(text)
        assert m is not None
        assert "Saber" in m.group(1)
        assert "Rem" in m.group(2)

    def test_multi_trade_with_et(self):
        text = "🤝 L'échange est terminé : **Char1** et **Char2** vs **Char3** et **Char4**"
        m = TRADE_PATTERN.search(text)
        assert m is not None

    def test_no_false_positive_on_random_vs(self):
        text = "some random vs text without trade prefix"
        assert TRADE_PATTERN.search(text) is None

    # --- English ---

    def test_english_single_trade(self):
        text = "🤝 The exchange is over: **Char1** vs **Char2**"
        m = TRADE_PATTERN.search(text)
        assert m is not None

    def test_english_multi_trade(self):
        text = "🤝 The exchange is over: **Char1**, **Char2** vs **Char3**, **Char4** (info)"
        m = TRADE_PATTERN.search(text)
        assert m is not None

    def test_english_trade_capture_groups(self):
        text = "🤝 The exchange is over: **Saber** vs **Rem**"
        m = TRADE_PATTERN.search(text)
        assert m is not None
        assert "Saber" in m.group(1)
        assert "Rem" in m.group(2)

    def test_english_multi_trade_with_and(self):
        text = "🤝 The exchange is over: **Char1** and **Char2** vs **Char3** and **Char4**"
        m = TRADE_PATTERN.search(text)
        assert m is not None


# ============================================================================
# Give pattern
# ============================================================================

class TestGivePattern:
    def test_give(self):
        text = "**Saber** donné à <@123456789>"
        m = GIVE_PATTERN.search(text)
        assert m is not None
        assert m.group(1) == "Saber"
        assert m.group(2) == "123456789"

    def test_give_with_exclamation_mention(self):
        text = "**Rem** donné à <@!987654321>"
        m = GIVE_PATTERN.search(text)
        assert m is not None
        assert m.group(1) == "Rem"
        assert m.group(2) == "987654321"

    # --- English ---

    def test_english_give(self):
        text = "**Saber** given to <@123456789>"
        m = GIVE_PATTERN.search(text)
        assert m is not None
        assert m.group(1) == "Saber"
        assert m.group(2) == "123456789"

    def test_english_give_with_exclamation_mention(self):
        text = "**Rem** given to <@!987654321>"
        m = GIVE_PATTERN.search(text)
        assert m is not None
        assert m.group(1) == "Rem"
        assert m.group(2) == "987654321"


# ============================================================================
# Character / Kakera patterns
# ============================================================================

class TestCharacterPatterns:
    def test_kakera_primary(self):
        text = "**1222**<:kakera:123>"
        assert CHARACTER_PATTERNS.KAKERA.PRIMARY.search(text)

    def test_kakera_primary_with_decimals(self):
        text = "**1.222**<:kakera:123>"
        m = CHARACTER_PATTERNS.KAKERA.PRIMARY.search(text)
        assert m is not None
        assert m.group(1) == "1.222"

    def test_kakera_alternative(self):
        text = "1222<a:kakera:123>"
        assert CHARACTER_PATTERNS.KAKERA.ALTERNATIVE.search(text)

    def test_kakera_fallback(self):
        assert CHARACTER_PATTERNS.KAKERA.FALLBACK.search("1222 ka")

    def test_owner_french(self):
        m = CHARACTER_PATTERNS.OWNER.FRENCH.search("appartient à alice")
        assert m is not None
        assert m.group(1) == "alice"

    def test_owner_english(self):
        m = CHARACTER_PATTERNS.OWNER.ENGLISH.search("belongs to alice")
        assert m is not None
        assert m.group(1) == "alice"
