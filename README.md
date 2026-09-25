---
title: MOSAIC-R Active Evidence Agent
emoji: 🔎
colorFrom: indigo
colorTo: cyan
sdk: gradio
app_file: app.py
pinned: false
license: mit
---

# MOSAIC-R: Active Evidence Agent

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

## Current milestone

The first milestone implements the explainable decision loop and a public-demo
interface. Open-source vision and speech adapters are isolated behind a clean
boundary so model choices can be evaluated and replaced without rewriting the
agent.

## Agent loop

```text
input -> evidence extraction -> conflict/sufficiency check ->
answer | request evidence | abstain -> trace + evaluation
```

## Run locally

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

The application is designed for a free Hugging Face Gradio Space using CPU
Basic hardware. No paid API key is required.

## Technology

- Python
- Gradio
- Hugging Face Transformers
- BLIP image captioning
- Whisper Tiny speech recognition
- Pytest evaluation suite

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
