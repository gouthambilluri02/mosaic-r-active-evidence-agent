from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from PIL import Image

from .models import Evidence, Modality


default_model_setting = "1" if os.getenv("SPACE_ID") else "0"
MODELS_ENABLED = os.getenv("MOSAIC_ENABLE_MODELS", default_model_setting) == "1"


@lru_cache(maxsize=1)
def _vision_pipeline():
    from transformers import pipeline

    return pipeline("image-to-text", model="Salesforce/blip-image-captioning-base")


@lru_cache(maxsize=1)
def _speech_pipeline():
    from transformers import pipeline

    return pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-tiny.en",
        chunk_length_s=20,
    )


def text_evidence(text: str | None) -> list[Evidence]:
    if not text or not text.strip():
        return []
    return [
        Evidence(
            modality=Modality.TEXT,
            content=text.strip(),
            confidence=0.88,
            source="user_text",
        )
    ]


def image_evidence(image: Image.Image | None) -> list[Evidence]:
    if image is None:
        return []
    if MODELS_ENABLED:
        try:
            result = _vision_pipeline()(image, max_new_tokens=40)[0]
            return [
                Evidence(
                    modality=Modality.IMAGE,
                    content=result["generated_text"].strip(),
                    confidence=0.72,
                    source="blip_caption",
                )
            ]
        except Exception as exc:  # surfaced in the evidence ledger, not hidden
            return [
                Evidence(
                    modality=Modality.IMAGE,
                    content=f"Image adapter failed: {type(exc).__name__}",
                    confidence=0.15,
                    source="vision_adapter_error",
                )
            ]
    return [
        Evidence(
            modality=Modality.IMAGE,
            content=f"Image received at {image.width}x{image.height}; model inference disabled.",
            confidence=0.35,
            source="image_metadata",
        )
    ]


def audio_evidence(audio_path: str | None) -> list[Evidence]:
    if not audio_path:
        return []
    if MODELS_ENABLED:
        try:
            result = _speech_pipeline()(audio_path)
            return [
                Evidence(
                    modality=Modality.AUDIO,
                    content=result["text"].strip(),
                    confidence=0.7,
                    source="whisper_transcript",
                )
            ]
        except Exception as exc:
            return [
                Evidence(
                    modality=Modality.AUDIO,
                    content=f"Audio adapter failed: {type(exc).__name__}",
                    confidence=0.15,
                    source="speech_adapter_error",
                )
            ]
    return [
        Evidence(
            modality=Modality.AUDIO,
            content=f"Audio received: {Path(audio_path).name}; model inference disabled.",
            confidence=0.35,
            source="audio_metadata",
        )
    ]


def collect_evidence(image, audio_path: str | None, text: str | None) -> list[Evidence]:
    return text_evidence(text) + image_evidence(image) + audio_evidence(audio_path)
