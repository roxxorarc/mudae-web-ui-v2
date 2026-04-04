LOG_EMOJIS = {
    'marriage': '\U0001f48d',
    'divorce': '\U0001f494',
    'trade': '\U0001f504',
    'give': '\U0001f381',
    'character': '\U0001f3ad',
    'success': '\u2705',
    'warning': '\u26a0\ufe0f',
    'error': '\u274c',
    'info': '\u2139\ufe0f',
    'search': '\U0001f50d',
    'cleanup': '\U0001f9f9',
}


class LOG_MESSAGES:
    class marriage:
        @staticmethod
        def detected(username: str, character: str) -> str:
            return f"Marriage: {username} \u2192 {character}"

        @staticmethod
        def updated(character: str, username: str, count: int) -> str:
            return f"Updated: {character} \u2192 {username} ({count} record(s))"

        @staticmethod
        def not_found(character: str) -> str:
            return f"Not found: {character} (will be added on next $mmi)"

    class divorce:
        @staticmethod
        def detected(username: str, characters: list[str]) -> str:
            return f"Divorce: {username} divorced {', '.join(characters)}"

        @staticmethod
        def updated(count: int, username: str) -> str:
            return f"Divorced: {count} character(s) from {username}"

        @staticmethod
        def not_found(username: str) -> str:
            return f"No characters found for {username}"

    class trade:
        @staticmethod
        def detected(left_user: str, left_chars: list[str], right_user: str, right_chars: list[str]) -> str:
            return f"Trade: {left_user} [{', '.join(left_chars)}] \u21d4\ufe0f {right_user} [{', '.join(right_chars)}]"

        @staticmethod
        def completed(left_chars: list[str], right_chars: list[str]) -> str:
            return f"Trade OK: {', '.join(left_chars)} \u21d4\ufe0f {', '.join(right_chars)}"

    class give:
        @staticmethod
        def detected(character: str, to_user: str) -> str:
            return f"Give: {character} \u2192 {to_user}"

        @staticmethod
        def completed(character: str, to_user: str) -> str:
            return f"Give OK: {character} \u2192 {to_user}"

        @staticmethod
        def not_found(character: str) -> str:
            return f"Not found: {character}"

    class character:
        @staticmethod
        def updated(name: str, changes: list[str]) -> str:
            return f"Updated: {name} ({', '.join(changes)})"

        @staticmethod
        def saved(name: str, owner: str | None, kakera: int) -> str:
            return f"Saved: {name} | Owner: {owner or 'none'} | Kakera: {kakera}"

    class error:
        @staticmethod
        def generic(context: str) -> str:
            return f"Error {context}"

        @staticmethod
        def fetch() -> str:
            return "Error fetching message"
