from __future__ import annotations

import json
import sys
from pathlib import Path

import gradio as gr

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from mosaic_r import ActiveEvidenceAgent  # noqa: E402
from mosaic_r.perception import collect_evidence  # noqa: E402
from mosaic_r.scenarios import SCENARIOS  # noqa: E402


agent = ActiveEvidenceAgent()


def _render(result):
    icon = {
        "answer": "✅",
        "request_evidence": "🔎",
        "abstain": "⛔",
    }[result.decision.value]
    request = (
        f"\n\n**Next evidence request:** {result.requested_evidence}"
        if result.requested_evidence
        else ""
    )
    conflicts = (
        "\n\n**Conflicts:** "
        + "; ".join(conflict.explanation for conflict in result.conflicts)
        if result.conflicts
        else ""
    )
    markdown = (
        f"## {icon} Decision: {result.decision.value.replace('_', ' ').title()}\n\n"
        f"{result.response}\n\n**Reliability score:** {result.confidence:.2f}"
        f"{request}{conflicts}"
    )
    return markdown, json.loads(result.model_dump_json())


def analyze(image, audio_path, text):
    evidence = collect_evidence(image, audio_path, text)
    return _render(agent.run(evidence))


def run_scenario(name):
    return _render(agent.run(SCENARIOS[name]))


theme = gr.themes.Soft(
    primary_hue="indigo",
    secondary_hue="cyan",
    neutral_hue="slate",
)

with gr.Blocks(theme=theme, title="MOSAIC-R Active Evidence Agent") as demo:
    gr.Markdown(
        """
        # MOSAIC-R · Active Evidence Agent
        **A multimodal agent that knows when it needs more evidence.**

        Upload image, voice, or text evidence. MOSAIC-R will answer, ask for the
        most useful missing evidence, or abstain—and show its decision trace.
        """
    )

    with gr.Tabs():
        with gr.Tab("Analyze evidence"):
            with gr.Row():
                with gr.Column():
                    image_input = gr.Image(type="pil", label="Image evidence")
                    audio_input = gr.Audio(type="filepath", label="Voice evidence")
                    text_input = gr.Textbox(
                        lines=5,
                        label="Text evidence",
                        placeholder="Describe the claim or decision that needs verification...",
                    )
                    analyze_button = gr.Button("Run evidence agent", variant="primary")
                with gr.Column():
                    decision_output = gr.Markdown()
                    trace_output = gr.JSON(label="Evidence ledger and decision trace")
            analyze_button.click(
                analyze,
                inputs=[image_input, audio_input, text_input],
                outputs=[decision_output, trace_output],
            )

        with gr.Tab("Scenario lab"):
            gr.Markdown(
                "Use controlled scenarios to inspect conflicts, clarification "
                "requests, and successful decisions without downloading models."
            )
            scenario_input = gr.Dropdown(
                choices=list(SCENARIOS), value=list(SCENARIOS)[0], label="Scenario"
            )
            scenario_button = gr.Button("Run scenario", variant="primary")
            scenario_decision = gr.Markdown()
            scenario_trace = gr.JSON(label="Trace")
            scenario_button.click(
                run_scenario,
                inputs=scenario_input,
                outputs=[scenario_decision, scenario_trace],
            )

        with gr.Tab("How it works"):
            gr.Markdown(
                """
                ### The engineering idea

                Conventional assistants optimize for producing an answer. MOSAIC-R
                optimizes for producing a **supported decision**. The system stores
                evidence by source and modality, checks cross-source consistency,
                estimates sufficiency, and selects the lowest-cost next action.

                This prototype uses deterministic decision policies so every action
                can be inspected and tested. Open-source perception models can be
                enabled independently, which makes model comparisons reproducible.
                """
            )


if __name__ == "__main__":
    demo.launch()

