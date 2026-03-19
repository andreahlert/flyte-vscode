"""
Flyte V2 Model Serving - AppEnvironment Example
================================================

Demonstrates AppEnvironment with server decorator,
startup/shutdown hooks, scaling, and deploy commands.
"""

import flyte
import flyte.app


# =============================================================================
# Inference App
# =============================================================================

inference_app = flyte.app.AppEnvironment(
    name="text-classifier",
    image=flyte.Image(
        name="inference",
        base="python:3.12-slim",
        packages=["transformers", "torch", "fastapi", "uvicorn"],
    ),
    port=8000,
    resources=flyte.Resources(
        cpu=2,
        memory="8Gi",
        gpu="T4:1",
    ),
    secrets=flyte.Secret("hf-token", as_env_var="HF_TOKEN"),
    requires_auth=True,
    env_vars={
        "MODEL_CHECKPOINT": "s3://models/bert-base-uncased/checkpoint-final",
        "MAX_BATCH_SIZE": "32",
    },
)


model_state = {"model": None, "tokenizer": None}


@inference_app.on_startup
def load_model():
    """Load the model into memory when the app starts."""
    model_state["model"] = "loaded-bert-model"
    model_state["tokenizer"] = "loaded-tokenizer"


@inference_app.server
def serve():
    """Start the FastAPI server for inference."""
    import uvicorn
    from fastapi import FastAPI

    app = FastAPI(title="Text Classifier")

    @app.post("/predict")
    async def predict(text: str):
        return {
            "text": text,
            "label": "positive",
            "confidence": 0.95,
            "model": "bert-base-uncased",
        }

    @app.get("/health")
    async def health():
        return {"status": "healthy", "model_loaded": model_state["model"] is not None}

    uvicorn.run(app, host="0.0.0.0", port=8000)


@inference_app.on_shutdown
def cleanup():
    """Release model resources on shutdown."""
    model_state["model"] = None
    model_state["tokenizer"] = None


# =============================================================================
# Batch Inference App
# =============================================================================

batch_app = flyte.app.AppEnvironment(
    name="batch-classifier",
    image="auto",
    port=8001,
    resources=flyte.Resources(
        cpu=4,
        memory="16Gi",
        gpu="A10:1",
    ),
    env_vars={
        "BATCH_SIZE": "64",
        "NUM_WORKERS": "4",
    },
)


# =============================================================================
# Entry point
# =============================================================================

if __name__ == "__main__":
    flyte.serve(inference_app)
