import test from "node:test";
import assert from "node:assert/strict";
import { runAgent, SCENARIOS, findConflicts, evidenceScore } from "../agent.mjs";

test("conflicting sources trigger an evidence request", () => {
  const result = runAgent(SCENARIOS.conflict.evidence);
  assert.equal(result.decision, "request_evidence");
  assert.equal(result.conflicts.length, 1);
  assert.match(result.requestedEvidence, /current state|photo/i);
});

test("consistent multimodal evidence passes the answer threshold", () => {
  const result = runAgent(SCENARIOS.consistent.evidence);
  assert.equal(result.decision, "answer");
  assert.ok(result.confidence >= 0.72);
});

test("missing evidence signal asks for the next-best input", () => {
  const result = runAgent(SCENARIOS.missing.evidence);
  assert.equal(result.decision, "request_evidence");
  assert.ok(result.requestedEvidence);
});

test("empty evidence abstains", () => {
  const result = runAgent([]);
  assert.equal(result.decision, "abstain");
});

test("coverage bonus rewards independent modalities", () => {
  const one = [{ modality: "text", content: "intact", confidence: 0.8, source: "a" }];
  const two = [...one, { modality: "image", content: "intact", confidence: 0.8, source: "b" }];
  assert.ok(evidenceScore(two) > evidenceScore(one));
});

test("conflict detector checks sources, topic and polarity", () => {
  const conflicts = findConflicts(SCENARIOS.conflict.evidence);
  assert.deepEqual(conflicts[0].topic, "damage");
});
