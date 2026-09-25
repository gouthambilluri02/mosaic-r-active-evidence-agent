from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from mosaic_r.models import DecisionType, Evidence, Modality
from mosaic_r.orchestrator import ActiveEvidenceAgent
from mosaic_r.scenarios import SCENARIOS


class ActiveEvidenceAgentTests(unittest.TestCase):
    def setUp(self):
        self.agent = ActiveEvidenceAgent()

    def test_conflict_requests_more_evidence(self):
        result = self.agent.run(SCENARIOS["Conflicting package report"])
        self.assertEqual(result.decision, DecisionType.REQUEST_EVIDENCE)
        self.assertEqual(len(result.conflicts), 1)
        self.assertTrue(result.requested_evidence)

    def test_consistent_multimodal_evidence_answers(self):
        result = self.agent.run(SCENARIOS["Consistent two-modal evidence"])
        self.assertEqual(result.decision, DecisionType.ANSWER)
        self.assertGreaterEqual(result.confidence, 0.72)

    def test_empty_evidence_abstains(self):
        result = self.agent.run([])
        self.assertEqual(result.decision, DecisionType.ABSTAIN)

    def test_explicit_missing_evidence_requests_more(self):
        result = self.agent.run(SCENARIOS["Missing receipt evidence"])
        self.assertEqual(result.decision, DecisionType.REQUEST_EVIDENCE)

    def test_low_confidence_requests_evidence(self):
        evidence = [
            Evidence(
                modality=Modality.IMAGE,
                content="An unclear image.",
                confidence=0.4,
                source="image",
            )
        ]
        result = self.agent.run(evidence)
        self.assertEqual(result.decision, DecisionType.REQUEST_EVIDENCE)


if __name__ == "__main__":
    unittest.main()
