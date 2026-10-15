"""Canary checks for the checkers (fix list #99).

Now and then a verify homework item shows a value that is wrong on purpose (a real value of the same field from another coin type; the record
itself stays right). An AI that sends it back unchanged was rubber-stamping instead of checking, and it shows in its numbers; one that sends the
true value back caught it. The selection is a hash of (assignment, item), so homework.py (which writes the sheet) and apply_changes.py (which
reads the answer) agree without storing anything; the shown value is read back from the assignment's own answer sheet.

Only facts that verify sheets show are used (composition, design, ruler, series, period): photo readings and looked-up numbers are blind
already, so there is nothing on the sheet to copy. This catches lazy checking, not a determined cheat who compares the sheet with the record.
"""
import hashlib

RATE = 0.06                    # about 3 in a batch of 50
FIELDS = {"composition": "composition.text", "design": "design.text", "ruler": "ruler", "series": "series", "period": "period"}


def _h(s):
    return int(hashlib.sha256(f"{s}|canary-v1".encode()).hexdigest()[:8], 16) / 2 ** 32


def chosen(aid, item):
    """True when this item of this assignment shows the planted value (homework assignments only)."""
    return str(aid).startswith("HW-") and _h(f"{aid}|{item}") < RATE


def decoy(item, value, others):
    """A plausible wrong value: another real value of the same field, picked by the item's hash. None when there is no other value."""
    pool = sorted(o for o in others if isinstance(o, str) and o.strip() and o != value)
    return pool[int(_h(item) * len(pool))] if pool else None
