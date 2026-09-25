from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from mosaic_r.models import DecisionType
from mosaic_r.orchestrator import ActiveEvidenceAgent
from mosaic_r.scenarios import SCENARIOS


EXPECTED = {
    "Conflicting package report": DecisionType.REQUEST_EVIDENCE,
    "Missing receipt evidence": DecisionType.REQUEST_EVIDENCE,
    "Consistent two-modal evidence": DecisionType.ANSWER,
}


def main() -> None:
    agent = ActiveEvidenceAgent()
    correct = 0
    print("scenario,expected,predicted,score")
    for name, evidence in SCENARIOS.items():
        result = agent.run(evidence)
        expected = EXPECTED[name]
        correct += result.decision == expected
        print(f"{name},{expected.value},{result.decision.value},{result.confidence:.3f}")
    print(f"decision_accuracy={correct / len(EXPECTED):.3f}")


if __name__ == "__main__":
    main()

