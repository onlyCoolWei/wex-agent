#!/usr/bin/env python3

import json
import sys


DIARY_PROMPT = """Before finishing, update docs/diary.md only if this user turn changed repository files.
- Under today's local `### YYYY-MM-DD` (newest first), add concise, nonduplicate Chinese result entries as `- emoji 描述`.
- Emoji: ✨ feature, 🔧 fix/adjustment, ⚡️ performance, 🌐 i18n, 🎊 milestone, 🗑️ removal.
- Ignore read-only turns and changes to the diary itself. Then finish normally.
"""


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, OSError):
        print("{}")
        return

    # A continued Stop event sets this flag. Returning without another block
    # prevents the diary check from recursively starting new turns.
    if event.get("stop_hook_active"):
        print("{}")
        return

    print(json.dumps({"decision": "block", "reason": DIARY_PROMPT}))


if __name__ == "__main__":
    main()
