#!/usr/bin/env python3

import json
import sys


DIARY_PROMPT = """Before finishing this task, review the work completed during the current user turn and update docs/diary.md when appropriate.

Rules:
1. Only record actual repository file changes made during the current user turn. If the turn was only analysis, explanation, review, status reporting, or other read-only work, do not edit the diary.
2. Group entries under today's local date using `### YYYY-MM-DD`. Reuse today's heading if it exists; otherwise insert a new date section at the top so dates remain newest first.
3. Write each entry in Chinese as `- emoji 简要描述`, using: ✨ new feature, 🔧 fix or adjustment, ⚡️ performance, 🌐 internationalization, 🎊 milestone or major change, 🗑️ removal.
4. Keep each entry concise and describe the result, not the implementation process.
5. Do not record changes to docs/diary.md itself, and do not duplicate an existing entry.
6. After checking or updating the diary, finish the task normally.
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
