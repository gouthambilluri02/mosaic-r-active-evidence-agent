from __future__ import annotations

from .models import Conflict, Evidence, Modality


def choose_next_request(
    evidence: list[Evidence], conflicts: list[Conflict]
) -> str:
    modalities = {item.modality for item in evidence}

    if conflicts:
        conflict_sources = " and ".join(
            sorted({source for c in conflicts for source in (c.left_source, c.right_source)})
        )
        if Modality.IMAGE not in modalities:
            return (
                f"Provide one clear photo that directly verifies the claim disputed by "
                f"{conflict_sources}."
            )
        return (
            "Answer one targeted clarification: which source reflects the current "
            "state, and when was each piece of evidence captured?"
        )

    if Modality.IMAGE not in modalities:
        return "Provide one clear photo of the relevant object or document."
    if Modality.TEXT not in modalities:
        return "Add a one-sentence description of what decision you need verified."
    if Modality.AUDIO not in modalities:
        return "Record a short voice note describing what happened and when."
    return "Provide a clearer version of the lowest-confidence input."

