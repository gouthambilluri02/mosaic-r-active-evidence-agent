from __future__ import annotations

from .models import AgentResult, DecisionType, Evidence, TraceStep
from .planner import choose_next_request
from .policy import evidence_score, find_conflicts, has_missing_evidence_signal


class ActiveEvidenceAgent:
    """Explainable policy loop for evidence-aware multimodal decisions."""

    def __init__(self, answer_threshold: float = 0.72, abstain_threshold: float = 0.25):
        self.answer_threshold = answer_threshold
        self.abstain_threshold = abstain_threshold

    def run(self, evidence: list[Evidence]) -> AgentResult:
        trace = [
            TraceStep(
                name="collect_evidence",
                status="completed",
                details={
                    "items": len(evidence),
                    "modalities": sorted({item.modality.value for item in evidence}),
                },
            )
        ]

        conflicts = find_conflicts(evidence)
        missing_signal = has_missing_evidence_signal(evidence)
        score = evidence_score(evidence)
        trace.append(
            TraceStep(
                name="evaluate_reliability",
                status="completed",
                details={
                    "score": round(score, 3),
                    "conflicts": len(conflicts),
                    "missing_evidence_signal": missing_signal,
                },
            )
        )

        if not evidence or score < self.abstain_threshold:
            trace.append(TraceStep(name="select_action", status="abstain"))
            return AgentResult(
                decision=DecisionType.ABSTAIN,
                response="I cannot make a reliable decision from the available evidence.",
                confidence=score,
                requested_evidence=choose_next_request(evidence, conflicts),
                evidence=evidence,
                conflicts=conflicts,
                trace=trace,
            )

        if conflicts or missing_signal or score < self.answer_threshold:
            request = choose_next_request(evidence, conflicts)
            trace.append(
                TraceStep(
                    name="select_action",
                    status="request_evidence",
                    details={"request": request},
                )
            )
            return AgentResult(
                decision=DecisionType.REQUEST_EVIDENCE,
                response=(
                    "I found conflicting or insufficient evidence, so answering now "
                    "would be unreliable."
                ),
                confidence=score,
                requested_evidence=request,
                evidence=evidence,
                conflicts=conflicts,
                trace=trace,
            )

        trace.append(TraceStep(name="select_action", status="answer"))
        summary = " | ".join(
            f"{item.modality.value}: {item.content}" for item in evidence
        )
        return AgentResult(
            decision=DecisionType.ANSWER,
            response=f"The available evidence is consistent: {summary}",
            confidence=score,
            evidence=evidence,
            conflicts=conflicts,
            trace=trace,
        )
