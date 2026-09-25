const POLARITY_TERMS = {
  damage: {
    positive: ["damaged", "broken", "cracked", "dented", "torn"],
    negative: ["not damaged", "undamaged", "intact", "no damage"],
  },
  approval: {
    positive: ["approved", "accepted", "authorized"],
    negative: ["not approved", "rejected", "denied", "unauthorized"],
  },
  presence: {
    positive: ["present", "included", "visible", "found"],
    negative: ["not present", "missing", "not included", "not visible"],
  },
  safety: {
    positive: ["safe", "secured", "protected", "wearing a helmet"],
    negative: ["unsafe", "unsecured", "unprotected", "without a helmet"],
  },
};

const MISSING_PHRASES = ["missing", "not included", "not visible", "unavailable", "unclear"];

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectPolarities(content) {
  const normalized = normalize(content);
  const detected = {};
  for (const [topic, groups] of Object.entries(POLARITY_TERMS)) {
    // Negative phrases come first because "not damaged" contains "damaged".
    for (const label of ["negative", "positive"]) {
      if (groups[label].some((term) => normalized.includes(term))) {
        detected[topic] = label;
        break;
      }
    }
  }
  return detected;
}

export function findConflicts(evidence) {
  const byTopic = new Map();
  for (const item of evidence) {
    for (const [topic, polarity] of Object.entries(detectPolarities(item.content))) {
      const claims = byTopic.get(topic) ?? [];
      claims.push({ item, polarity });
      byTopic.set(topic, claims);
    }
  }

  const conflicts = [];
  for (const [topic, claims] of byTopic) {
    for (let leftIndex = 0; leftIndex < claims.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < claims.length; rightIndex += 1) {
        const left = claims[leftIndex];
        const right = claims[rightIndex];
        if (left.polarity !== right.polarity && left.item.source !== right.item.source) {
          conflicts.push({
            topic,
            leftSource: left.item.source,
            rightSource: right.item.source,
            explanation: `${left.item.source} and ${right.item.source} provide opposing evidence about ${topic}.`,
          });
        }
      }
    }
  }
  return conflicts;
}

export function evidenceScore(evidence) {
  if (!evidence.length) return 0;
  const modalities = new Set(evidence.map((item) => item.modality)).size;
  const meanConfidence = evidence.reduce((total, item) => total + item.confidence, 0) / evidence.length;
  const coverageBonus = Math.min(0.15, 0.075 * Math.max(0, modalities - 1));
  return Math.min(1, meanConfidence + coverageBonus);
}

export function chooseNextRequest(evidence, conflicts) {
  const modalities = new Set(evidence.map((item) => item.modality));
  if (conflicts.length) {
    const sources = [...new Set(conflicts.flatMap((item) => [item.leftSource, item.rightSource]))].sort();
    if (!modalities.has("image")) {
      return `Provide one clear photo that directly verifies the claim disputed by ${sources.join(" and ")}.`;
    }
    return "Clarify which source reflects the current state and when each piece of evidence was captured.";
  }
  if (!modalities.has("image")) return "Provide one clear photo of the relevant object or document.";
  if (!modalities.has("text")) return "Add one sentence explaining the decision that needs verification.";
  if (!modalities.has("audio")) return "Add a short voice note describing what happened and when.";
  return "Provide a clearer version of the lowest-confidence input.";
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

export function runAgent(evidence, perceptionErrors = []) {
  const startedAt = performance.now();
  const modalities = [...new Set(evidence.map((item) => item.modality))].sort();
  const trace = [
    {
      agent: "Evidence Collector",
      status: "completed",
      details: { items: evidence.length, modalities, adapterErrors: perceptionErrors },
    },
  ];

  const conflicts = findConflicts(evidence);
  const missingSignal = evidence.some((item) =>
    MISSING_PHRASES.some((phrase) => normalize(item.content).includes(phrase)),
  );
  const baseScore = evidenceScore(evidence);
  const reliability = Math.max(0, baseScore - conflicts.length * 0.22 - perceptionErrors.length * 0.08);

  trace.push({
    agent: "Conflict Inspector",
    status: conflicts.length ? "conflict_found" : "consistent",
    details: { conflicts },
  });
  trace.push({
    agent: "Reliability Judge",
    status: "completed",
    details: { baseScore: round(baseScore), reliability: round(reliability), missingSignal },
  });

  let decision;
  let response;
  let requestedEvidence = null;

  if (!evidence.length || reliability < 0.25) {
    decision = "abstain";
    response = "I cannot make a reliable decision from the available evidence.";
    requestedEvidence = chooseNextRequest(evidence, conflicts);
  } else if (conflicts.length || missingSignal || reliability < 0.72) {
    decision = "request_evidence";
    response = conflicts.length
      ? "The sources disagree, so making a decision now would be unreliable."
      : "The available evidence is incomplete, so the agent is requesting the smallest useful follow-up.";
    requestedEvidence = chooseNextRequest(evidence, conflicts);
  } else {
    decision = "answer";
    response = `The available evidence is sufficiently consistent across ${modalities.length} ${modalities.length === 1 ? "modality" : "modalities"}.`;
  }

  trace.push({
    agent: "Action Planner",
    status: decision,
    details: requestedEvidence ? { requestedEvidence } : { rationale: "Evidence passed the answer threshold." },
  });
  trace.push({
    agent: "Supervisor",
    status: "completed",
    details: { elapsedMs: round(performance.now() - startedAt), policyVersion: "mosaic-r/0.2" },
  });

  return {
    decision,
    response,
    confidence: round(reliability),
    requestedEvidence,
    evidence,
    conflicts,
    trace,
    policy: { answerThreshold: 0.72, abstainThreshold: 0.25 },
  };
}

export const SCENARIOS = {
  conflict: {
    title: "Conflicting package report",
    description: "Text and image evidence disagree about visible damage.",
    evidence: [
      { modality: "text", content: "The package arrived damaged and the corner is torn.", confidence: 0.92, source: "customer report" },
      { modality: "image", content: "The package appears intact with no damage visible.", confidence: 0.81, source: "delivery photo" },
    ],
  },
  missing: {
    title: "Missing receipt evidence",
    description: "One claim is strong, but its supporting document is missing.",
    evidence: [
      { modality: "text", content: "The reimbursement was approved, but the receipt is missing.", confidence: 0.84, source: "expense note" },
    ],
  },
  consistent: {
    title: "Consistent multimodal evidence",
    description: "Independent text and image sources agree.",
    evidence: [
      { modality: "text", content: "The package is damaged and has a cracked side.", confidence: 0.91, source: "customer report" },
      { modality: "image", content: "A damaged cardboard package with a cracked side.", confidence: 0.82, source: "image caption" },
    ],
  },
};
