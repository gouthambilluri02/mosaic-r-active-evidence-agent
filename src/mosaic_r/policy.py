from __future__ import annotations

import re
from collections import defaultdict

from .models import Conflict, Evidence


POLARITY_TERMS = {
    "damage": {
        "positive": ("damaged", "broken", "cracked", "dented", "torn"),
        "negative": ("not damaged", "undamaged", "intact", "no damage"),
    },
    "approval": {
        "positive": ("approved", "accepted", "authorized"),
        "negative": ("not approved", "rejected", "denied", "unauthorized"),
    },
    "presence": {
        "positive": ("present", "included", "visible", "found"),
        "negative": ("not present", "missing", "not included", "not visible"),
    },
}


def _polarity(content: str) -> dict[str, str]:
    normalized = re.sub(r"\s+", " ", content.lower()).strip()
    detected: dict[str, str] = {}
    for topic, groups in POLARITY_TERMS.items():
        # Negative phrases are checked first because "not damaged" contains
        # the positive token "damaged".
        for label in ("negative", "positive"):
            if any(term in normalized for term in groups[label]):
                detected[topic] = label
                break
    return detected


def find_conflicts(evidence: list[Evidence]) -> list[Conflict]:
    by_topic: dict[str, list[tuple[Evidence, str]]] = defaultdict(list)
    for item in evidence:
        for topic, polarity in _polarity(item.content).items():
            by_topic[topic].append((item, polarity))

    conflicts: list[Conflict] = []
    for topic, claims in by_topic.items():
        for index, (left, left_polarity) in enumerate(claims):
            for right, right_polarity in claims[index + 1 :]:
                if left_polarity != right_polarity:
                    conflicts.append(
                        Conflict(
                            left_source=left.source,
                            right_source=right.source,
                            topic=topic,
                            explanation=(
                                f"{left.source} and {right.source} provide "
                                f"opposing evidence about {topic}."
                            ),
                        )
                    )
    return conflicts


def evidence_score(evidence: list[Evidence]) -> float:
    if not evidence:
        return 0.0
    modalities = len({item.modality for item in evidence})
    mean_confidence = sum(item.confidence for item in evidence) / len(evidence)
    coverage_bonus = min(0.15, 0.075 * max(0, modalities - 1))
    return min(1.0, mean_confidence + coverage_bonus)


def has_missing_evidence_signal(evidence: list[Evidence]) -> bool:
    missing_phrases = ("missing", "not included", "not visible", "unavailable")
    return any(
        phrase in item.content.lower()
        for item in evidence
        for phrase in missing_phrases
    )
