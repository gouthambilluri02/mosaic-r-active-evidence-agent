---
title: MOSAIC-R Active Evidence Agent
emoji: 🔎
colorFrom: indigo
colorTo: cyan
sdk: static
app_file: index.html
pinned: false
license: mit
---

# MOSAIC-R: Active Evidence Agent

[![Tests and deployment](https://github.com/gouthambilluri02/mosaic-r-active-evidence-agent/actions/workflows/test.yml/badge.svg)](https://github.com/gouthambilluri02/mosaic-r-active-evidence-agent/actions/workflows/test.yml)

MOSAIC-R is a multimodal reliability agent that works with text, images, and
voice. Instead of forcing an answer when evidence is incomplete or
contradictory, it chooses one of three actions:

1. answer with an evidence trail;
2. request the smallest useful piece of additional evidence; or
3. abstain when a reliable decision is not possible.

The project is intentionally evaluation-first. It records each step in the
decision trace and includes reproducible scenarios for conflict detection,
evidence acquisition, and recovery testing.

## Why this exists

Multimodal AI systems often treat every input as equally trustworthy and still
produce confident answers when a photo is unclear, a voice note conflicts with
written text, or an extraction tool fails. MOSAIC-R treats evidence quality as
part of the task.

## Live demo

**Hugging Face Space:** https://huggingface.co/spaces/gouthambilluri02/mosaic-r-active-evidence-agent

The public demo is a static, privacy-first application. Quantized image
captioning and speech-recognition models execute in the visitor's browser with
Transformers.js and WASM. Inputs are not uploaded to an application server and
no API key is required.

## Agent loop

```text
input -> evidence extraction -> conflict/sufficiency check ->
answer | request evidence | abstain -> trace + evaluation
```

## Architecture

- **Vision agent:** converts image evidence into a grounded caption.
- **Speech agent:** transcribes voice evidence with Whisper Tiny.
- **Conflict inspector:** compares claims by topic and polarity.
- **Reliability judge:** scores confidence and independent modality coverage.
- **Action planner:** answers, asks for the next-best evidence, or abstains.
- **Supervisor:** exposes the complete machine-readable decision trace.

The deterministic policy is intentional: agent decisions are reproducible,
testable, and explainable instead of being hidden inside an LLM prompt.

## Run locally

Serve the repository with any static web server:

```bash
python -m http.server 7860
```

Then open `http://localhost:7860`. The model files are downloaded only when a
real image or audio input is analyzed; controlled scenarios work immediately.

The original Python reference policy can also be run locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

To keep local development light, model inference is disabled by default. Set
`MOSAIC_ENABLE_MODELS=1` to enable the Hugging Face vision and speech adapters.
The scenario lab always works without downloading a model.

## Tests

```bash
python -m unittest discover -s tests -v
python scripts/evaluate.py
```

## Free deployment

The live application uses a free Hugging Face **Static Space**. GitHub Actions
runs both policy suites and publishes the repository after tests pass. Add a
fine-grained Hugging Face write token as the GitHub Actions secret `HF_TOKEN`
to enable automatic deployment.

## Technology

- JavaScript modules
- Transformers.js + ONNX Runtime Web
- Web Workers + WASM
- BLIP image captioning
- Whisper Tiny speech recognition
- Python reference policy
- Node and Python evaluation suites

## Roadmap

- [x] Explainable evidence ledger
- [x] Conflict and sufficiency policies
- [x] Active clarification planner
- [x] Reproducible scenario lab
- [ ] Calibrated uncertainty thresholds
- [ ] Image-region and audio-timestamp citations
- [ ] Failure injection and automatic recovery
- [ ] Benchmark dashboard and regression gates

## Responsible use

MOSAIC-R is a portfolio and research prototype. It should not be used for
medical, legal, financial, employment, or safety-critical decisions.
