from __future__ import annotations

from .models import Evidence, Modality


SCENARIOS: dict[str, list[Evidence]] = {
    "Conflicting package report": [
        Evidence(
            modality=Modality.TEXT,
            content="The package arrived damaged and the corner is torn.",
            confidence=0.92,
            source="customer_report",
        ),
        Evidence(
            modality=Modality.IMAGE,
            content="The package appears intact with no damage visible.",
            confidence=0.81,
            source="delivery_photo",
        ),
    ],
    "Missing receipt evidence": [
        Evidence(
            modality=Modality.TEXT,
            content="The reimbursement was approved, but the receipt is missing.",
            confidence=0.84,
            source="expense_note",
        )
    ],
    "Consistent two-modal evidence": [
        Evidence(
            modality=Modality.TEXT,
            content="The package is damaged and has a cracked side.",
            confidence=0.91,
            source="customer_report",
        ),
        Evidence(
            modality=Modality.IMAGE,
            content="A damaged cardboard package with a cracked side.",
            confidence=0.82,
            source="image_caption",
        ),
    ],
}

