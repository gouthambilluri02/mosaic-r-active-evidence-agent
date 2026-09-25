import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_CONFIG = {
  image: {
    task: "image-to-text",
    model: "Xenova/vit-gpt2-image-captioning",
  },
  audio: {
    task: "automatic-speech-recognition",
    model: "Xenova/whisper-tiny.en",
  },
};

const pipelines = new Map();

function reportProgress(kind, info) {
  self.postMessage({
    type: "progress",
    kind,
    status: info.status,
    file: info.file ?? "model",
    progress: Number.isFinite(info.progress) ? Math.round(info.progress) : null,
  });
}

async function getPipeline(kind) {
  if (!pipelines.has(kind)) {
    const config = MODEL_CONFIG[kind];
    pipelines.set(
      kind,
      pipeline(config.task, config.model, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (info) => reportProgress(kind, info),
      }),
    );
  }
  return pipelines.get(kind);
}

self.addEventListener("message", async (event) => {
  const { id, kind, url } = event.data;
  try {
    const model = await getPipeline(kind);
    let output;
    if (kind === "audio") {
      output = await model(url, { chunk_length_s: 30, stride_length_s: 5 });
    } else {
      output = await model(url, { max_new_tokens: 48 });
    }
    const content = kind === "audio"
      ? output.text
      : output[0]?.generated_text ?? "The image could not be described.";
    self.postMessage({ type: "result", id, kind, content: content.trim() });
  } catch (error) {
    pipelines.delete(kind);
    self.postMessage({
      type: "error",
      id,
      kind,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
