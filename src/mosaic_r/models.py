from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Modality(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"


class DecisionType(str, Enum):
    ANSWER = "answer"
    REQUEST_EVIDENCE = "request_evidence"
    ABSTAIN = "abstain"


class Evidence(BaseModel):
    modality: Modality
    content: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str


class Conflict(BaseModel):
    left_source: str
    right_source: str
    topic: str
    explanation: str


class TraceStep(BaseModel):
    name: str
    status: str
    details: dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    decision: DecisionType
    response: str
    confidence: float = Field(ge=0.0, le=1.0)
    requested_evidence: str | None = None
    evidence: list[Evidence] = Field(default_factory=list)
    conflicts: list[Conflict] = Field(default_factory=list)
    trace: list[TraceStep] = Field(default_factory=list)

