import { runAgent, SCENARIOS } from "./agent.mjs";

const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#evidence-form"),
  text: $("#text-evidence"),
  image: $("#image-evidence"),
  audio: $("#audio-evidence"),
  imageName: $("#image-name"),
  audioName: $("#audio-name"),
  analyze: $("#analyze-button"),
  status: $("#model-status"),
  progress: $("#model-progress"),
  result: $("#result-panel"),
  empty: $("#empty-result"),
  decision: $("#decision"),
  decisionBadge: $("#decision-badge"),
  confidence: $("#confidence"),
  confidenceBar: $("#confidence-bar"),
  response: $("#response"),
  request: $("#request-card"),
  requestText: $("#request-text"),
  conflicts: $("#conflicts"),
  ledger: $("#ledger"),
  trace: $("#trace"),
  traceJson: $("#trace-json"),
  copy: $("#copy-trace"),
  download: $("#download-trace"),
};

const worker = new Worker("./worker.mjs", { type: "module" });
const pending = new Map();
let requestId = 0;
let latestResult = null;

worker.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "progress") {
    const label = message.kind === "image" ? "vision" : "speech";
    const percent = message.progress === null ? "" : ` ${message.progress}%`;
    elements.status.textContent = `Loading ${label} model${percent}`;
    if (message.progress !== null) elements.progress.value = message.progress;
    return;
  }

  const promise = pending.get(message.id);
  if (!promise) return;
  pending.delete(message.id);
  message.type === "result" ? promise.resolve(message.content) : promise.reject(new Error(message.message));
});

function infer(kind, file) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const url = URL.createObjectURL(file);
    pending.set(id, {
      resolve: (value) => {
        URL.revokeObjectURL(url);
        resolve(value);
      },
      reject: (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      },
    });
    worker.postMessage({ id, kind, url });
  });
}

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function humanDecision(decision) {
  return { answer: "Supported answer", request_evidence: "Request evidence", abstain: "Abstain" }[decision];
}

function renderResult(result) {
  latestResult = result;
  elements.empty.hidden = true;
  elements.result.hidden = false;
  elements.decision.textContent = humanDecision(result.decision);
  elements.decisionBadge.dataset.decision = result.decision;
  elements.decisionBadge.textContent = result.decision === "answer" ? "READY" : result.decision === "abstain" ? "STOPPED" : "FOLLOW-UP";
  elements.confidence.textContent = `${Math.round(result.confidence * 100)}%`;
  elements.confidenceBar.style.width = `${Math.round(result.confidence * 100)}%`;
  elements.response.textContent = result.response;

  elements.request.hidden = !result.requestedEvidence;
  elements.requestText.textContent = result.requestedEvidence ?? "";

  elements.conflicts.replaceChildren();
  if (result.conflicts.length) {
    result.conflicts.forEach((conflict) => {
      const item = createElement("li", "conflict-item", conflict.explanation);
      elements.conflicts.append(item);
    });
  }

  elements.ledger.replaceChildren();
  result.evidence.forEach((item, index) => {
    const card = createElement("article", "ledger-item");
    const top = createElement("div", "ledger-top");
    top.append(
      createElement("span", `modality modality-${item.modality}`, item.modality.toUpperCase()),
      createElement("span", "source", item.source),
      createElement("span", "score", `${Math.round(item.confidence * 100)}%`),
    );
    card.append(top, createElement("p", "", item.content));
    card.style.setProperty("--delay", `${index * 60}ms`);
    elements.ledger.append(card);
  });

  elements.trace.replaceChildren();
  result.trace.forEach((step, index) => {
    const row = createElement("li", "trace-step");
    row.append(
      createElement("span", "trace-index", String(index + 1).padStart(2, "0")),
      createElement("span", "trace-agent", step.agent),
      createElement("span", "trace-status", step.status.replaceAll("_", " ")),
    );
    elements.trace.append(row);
  });
  elements.traceJson.textContent = JSON.stringify(result, null, 2);
  elements.result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function validateFile(file, prefix, maxMb) {
  if (!file) return;
  if (!file.type.startsWith(prefix)) throw new Error(`Choose a valid ${prefix.slice(0, -1)} file.`);
  if (file.size > maxMb * 1024 * 1024) throw new Error(`Keep the ${prefix.slice(0, -1)} file below ${maxMb} MB.`);
}

async function analyze(event) {
  event.preventDefault();
  const imageFile = elements.image.files[0];
  const audioFile = elements.audio.files[0];
  const text = elements.text.value.trim();

  try {
    validateFile(imageFile, "image/", 10);
    validateFile(audioFile, "audio/", 25);
  } catch (error) {
    elements.status.textContent = error.message;
    return;
  }

  elements.analyze.disabled = true;
  elements.progress.hidden = false;
  elements.progress.removeAttribute("value");
  elements.status.textContent = "Collecting evidence";
  const evidence = [];
  const perceptionErrors = [];

  if (text) evidence.push({ modality: "text", content: text, confidence: 0.88, source: "user statement" });

  if (imageFile) {
    try {
      elements.status.textContent = "Vision agent is inspecting the image";
      const caption = await infer("image", imageFile);
      evidence.push({ modality: "image", content: caption, confidence: 0.76, source: "vision agent" });
    } catch (error) {
      perceptionErrors.push(`Vision adapter: ${error.message}`);
    }
  }

  if (audioFile) {
    try {
      elements.status.textContent = "Speech agent is transcribing the voice evidence";
      const transcript = await infer("audio", audioFile);
      evidence.push({ modality: "audio", content: transcript, confidence: 0.72, source: "speech agent" });
    } catch (error) {
      perceptionErrors.push(`Speech adapter: ${error.message}`);
    }
  }

  elements.status.textContent = "Supervisor is evaluating reliability";
  renderResult(runAgent(evidence, perceptionErrors));
  elements.status.textContent = perceptionErrors.length ? "Completed with adapter warnings" : "Analysis complete · models cached locally";
  elements.progress.hidden = true;
  elements.analyze.disabled = false;
}

elements.form.addEventListener("submit", analyze);

elements.image.addEventListener("change", () => {
  elements.imageName.textContent = elements.image.files[0]?.name ?? "PNG, JPG or WEBP · max 10 MB";
});
elements.audio.addEventListener("change", () => {
  elements.audioName.textContent = elements.audio.files[0]?.name ?? "MP3, WAV or M4A · max 25 MB";
});

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => {
    const scenario = SCENARIOS[button.dataset.scenario];
    renderResult(runAgent(scenario.evidence));
    elements.status.textContent = `Scenario loaded · ${scenario.title}`;
  });
});

elements.copy.addEventListener("click", async () => {
  if (!latestResult) return;
  await navigator.clipboard.writeText(JSON.stringify(latestResult, null, 2));
  elements.copy.textContent = "Copied";
  setTimeout(() => { elements.copy.textContent = "Copy JSON"; }, 1200);
});

elements.download.addEventListener("click", () => {
  if (!latestResult) return;
  const blob = new Blob([JSON.stringify(latestResult, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mosaic-r-trace-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});
