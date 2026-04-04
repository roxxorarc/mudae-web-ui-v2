import re

MUDAE_BOT_ID = 432610292342587392

MARRIAGE_PATTERNS = [
    # Standard FR format: "💖 **username** et **characterName** sont maintenant mariés ! 💖"
    re.compile(r"(?:[💞💖💗❤️🎊🎉]\s*)?(.+?)\s+et\s+(.+?)\s+sont maintenant mariés[\s!.💞💖💗❤️🎊🎉]*$", re.IGNORECASE),

    # English format: "💖 **username** and **characterName** are now married! 💖"
    re.compile(r"(?:[💞💖💗❤️🎊🎉]\s*)?(.+?)\s+(?:and|&)\s+(.+?)\s+are now married[\s!.💞💖💗❤️🎊🎉]*$", re.IGNORECASE),
    
    # Short format: "username ❤️ characterName"
    re.compile(r"(.+?)\s+(?:❤️|💖|💗|💞)\s+(.+?)[\s!.]*$"),
    
    # "married to" format: "username married to characterName"
    re.compile(r"(.+?)\s+(?:married to|épouse|a épousé)\s+(.+?)[\s!.]*$", re.IGNORECASE),
    
    # "x" format: "username x characterName"
    re.compile(r"(.+?)\s+x\s+(.+?)[\s!.]*$", re.IGNORECASE),
]

# ============================================================================
# DETECTION PATTERNS - DIVORCES
# ============================================================================
DIVORCE_PATTERN = re.compile(r"(?:💔\s*)?(.+?)\s+(?:sont maintenant divorcés|are now divorced)", re.IGNORECASE)

# ============================================================================
# DETECTION PATTERNS - TRADES
# ============================================================================
_APOS = "[\x27\u2018\u2019]"  # ASCII apostrophe + left/right single quotes
TRADE_PATTERN = re.compile(f"(?:🤝\\s*)?(?:L{_APOS}échange est terminé|The trade is done)\\s*:\\s*(.+?)\\s+vs\\s+(.+?)(?:\\s*\\(|\\s*$)", re.IGNORECASE)

# ============================================================================
# DETECTION PATTERNS - GIFTS (DONATIONS)
# ============================================================================
GIVE_PATTERN = re.compile(r"\*\*(.+?)\*\*\s+(?:donné à|given to)\s+<@!?(\d+)>", re.IGNORECASE)

# ============================================================================
# DETECTION PATTERNS - CHANGEIMG
# ============================================================================
CHANGEIMG_PATTERN = re.compile(r"^\$changeimg\s+(.+?)(?:\s*\$\s*|\s+)(\d+)$")

# ============================================================================
# DETECTION PATTERNS - CHARACTERS ($mmi & co)
# ============================================================================
class CHARACTER_PATTERNS:
    class KAKERA:
        PRIMARY = re.compile(r"\*\*(\d+(?:[.,]\d+)?)\*\*\s*<a?:kakera:", re.IGNORECASE)
        FALLBACK = re.compile(r"(\d+)\s*ka", re.IGNORECASE)
        ALTERNATIVE = re.compile(r"(\d+(?:[.,]\d+)?)(?:\s*)?<a?:kakera[^>]*>", re.IGNORECASE)
        
    class OWNER:
        FRENCH = re.compile(r"appartient à\s+(\S+)", re.IGNORECASE)
        ENGLISH = re.compile(r"belongs to\s+(\S+)", re.IGNORECASE)
        
    CUSTOM_EMOJI = re.compile(r"<:[a-zA-Z0-9_]+:[0-9]+>")
