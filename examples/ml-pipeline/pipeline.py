"""
Flyte V2 ML Pipeline - Comprehensive Example
=============================================

This project demonstrates all Flyte V2 features supported by the
flyte-vscode extension: TaskEnvironment, @env.task, Resources (CPU/GPU),
Cache, Triggers, Secrets, AppEnvironment, flyte.map, flyte.group,
flyte.trace, flyte.run, and flyte.deploy.

Pipeline: end-to-end ML training with data ingestion, preprocessing,
distributed training, evaluation, and model serving.
"""

import asyncio
from datetime import timedelta

import flyte


# =============================================================================
# Environments
# =============================================================================

# CPU environment for data processing tasks
data_env = flyte.TaskEnvironment(
    name="data-processing",
    image=(
        flyte.Image.from_debian_base()
        .with_pip_packages("pandas", "pyarrow", "requests", "scikit-learn")
    ),
    resources=flyte.Resources(cpu=2, memory="4Gi", disk="20Gi"),
    cache="auto",
    env_vars={"PYTHONUNBUFFERED": "1"},
    interruptible=True,
    queue="default",
)

# GPU environment for model training
train_env = flyte.TaskEnvironment(
    name="gpu-training",
    image=(
        flyte.Image.from_debian_base()
        .with_pip_packages("transformers", "datasets", "wandb", "accelerate")
    ),
    resources=flyte.Resources(
        cpu=(4, 8),
        memory="32Gi",
        gpu="A100:1",
        shm="auto",
    ),
    secrets=flyte.Secret("wandb-api-key", as_env_var="WANDB_API_KEY"),
    cache=flyte.Cache(
        behavior="auto",
        ignored_inputs=("seed",),
    ),
)

# Lightweight environment for evaluation and metrics
eval_env = flyte.TaskEnvironment(
    name="evaluation",
    image="auto",
    resources=flyte.Resources(cpu=2, memory="8Gi"),
    cache="auto",
    interruptible=True,
)

# Multi-GPU environment for distributed training
distributed_env = flyte.TaskEnvironment(
    name="distributed-training",
    image=(
        flyte.Image.from_debian_base()
        .with_pip_packages("transformers", "datasets", "wandb", "accelerate", "deepspeed")
    ),
    resources=flyte.Resources(
        cpu=8,
        memory="64Gi",
        gpu="H100:4",
        shm="auto",
        disk="100Gi",
    ),
    secrets=[
        flyte.Secret("wandb-api-key", as_env_var="WANDB_API_KEY"),
        flyte.Secret("hf-token", as_env_var="HF_TOKEN"),
    ],
    env_vars={
        "NCCL_DEBUG": "INFO",
        "TOKENIZERS_PARALLELISM": "false",
    },
)


# =============================================================================
# Data Tasks
# =============================================================================

@data_env.task
async def fetch_dataset(
    source_url: str,
    split: str = "train",
) -> dict:
    """Download and validate a dataset from a remote source."""
    data = {
        "source": source_url,
        "split": split,
        "num_samples": 50000,
        "columns": ["text", "label"],
    }
    return data


@data_env.task(retries=2, timeout=timedelta(minutes=30))
async def preprocess_shard(
    shard: dict,
    max_length: int = 512,
    lowercase: bool = True,
) -> dict:
    """Clean and tokenize a single data shard."""
    return {
        "shard_id": shard.get("shard_id", 0),
        "num_tokens": shard.get("num_samples", 0) * max_length,
        "max_length": max_length,
        "processed": True,
    }


@data_env.task
async def split_into_shards(
    dataset: dict,
    num_shards: int = 8,
) -> list[dict]:
    """Split dataset into shards for parallel processing."""
    shards = []
    samples_per_shard = dataset["num_samples"] // num_shards
    for i in range(num_shards):
        shards.append({
            "shard_id": i,
            "num_samples": samples_per_shard,
            "columns": dataset["columns"],
        })
    return shards


@data_env.task
async def merge_shards(processed_shards: list[dict]) -> dict:
    """Merge preprocessed shards back into a single dataset."""
    total_tokens = sum(s["num_tokens"] for s in processed_shards)
    return {
        "num_shards": len(processed_shards),
        "total_tokens": total_tokens,
        "ready_for_training": True,
    }


@data_env.task
async def create_train_val_split(
    dataset: dict,
    val_ratio: float = 0.1,
) -> dict:
    """Split processed data into train and validation sets."""
    total = dataset["total_tokens"]
    return {
        "train_tokens": int(total * (1 - val_ratio)),
        "val_tokens": int(total * val_ratio),
        "val_ratio": val_ratio,
    }


# =============================================================================
# Training Tasks
# =============================================================================

@train_env.task(
    retries=1,
    timeout=timedelta(hours=4),
    triggers=flyte.Trigger(
        name="nightly-retrain",
        automation=flyte.Cron("0 2 * * *", timezone="America/Sao_Paulo"),
        description="Retrain model nightly at 2 AM BRT",
    ),
)
async def train_model(
    train_data: dict,
    model_name: str = "bert-base-uncased",
    epochs: int = 3,
    learning_rate: float = 5e-5,
    batch_size: int = 32,
    seed: int = 42,
) -> dict:
    """Fine-tune a transformer model on the processed dataset."""
    result = {
        "model_name": model_name,
        "epochs": epochs,
        "learning_rate": learning_rate,
        "batch_size": batch_size,
        "train_tokens": train_data["train_tokens"],
        "train_loss": 0.234,
        "val_loss": 0.312,
        "checkpoint_path": f"s3://models/{model_name}/checkpoint-final",
    }
    return result


@distributed_env.task(
    retries=1,
    timeout=timedelta(hours=12),
)
async def train_large_model(
    train_data: dict,
    model_name: str = "meta-llama/Llama-3-8B",
    epochs: int = 1,
    learning_rate: float = 2e-5,
    batch_size: int = 4,
    gradient_accumulation_steps: int = 8,
    seed: int = 42,
) -> dict:
    """Fine-tune a large model using distributed training with DeepSpeed."""
    result = {
        "model_name": model_name,
        "epochs": epochs,
        "effective_batch_size": batch_size * gradient_accumulation_steps * 4,
        "train_tokens": train_data["train_tokens"],
        "train_loss": 0.189,
        "checkpoint_path": f"s3://models/{model_name}/checkpoint-final",
    }
    return result


# =============================================================================
# Evaluation Tasks
# =============================================================================

@eval_env.task
async def evaluate_model(
    model_result: dict,
    val_data: dict,
) -> dict:
    """Run evaluation metrics on the trained model."""
    metrics = {
        "model_name": model_result["model_name"],
        "accuracy": 0.923,
        "f1_score": 0.918,
        "precision": 0.931,
        "recall": 0.906,
        "val_tokens": val_data["val_tokens"],
        "checkpoint_path": model_result["checkpoint_path"],
    }
    return metrics


@eval_env.task
async def compare_models(evaluations: list[dict]) -> dict:
    """Compare multiple model evaluations and pick the best."""
    best = max(evaluations, key=lambda e: e["f1_score"])
    return {
        "best_model": best["model_name"],
        "best_f1": best["f1_score"],
        "best_checkpoint": best["checkpoint_path"],
        "candidates_evaluated": len(evaluations),
    }


@eval_env.task(
    triggers=flyte.Trigger.weekly(name="weekly-report"),
)
async def generate_report(
    comparison: dict,
    data_stats: dict,
) -> str:
    """Generate a markdown training report."""
    report = f"""# Training Report

## Data
- Total tokens: {data_stats['total_tokens']:,}
- Train/Val split: {data_stats.get('val_ratio', 0.1):.0%}

## Best Model
- Name: {comparison['best_model']}
- F1 Score: {comparison['best_f1']:.3f}
- Candidates evaluated: {comparison['candidates_evaluated']}
"""
    return report


# =============================================================================
# Orchestration: Main Pipeline
# =============================================================================

@data_env.task
async def run_training_pipeline(
    source_url: str = "s3://datasets/text-classification/v2",
    num_shards: int = 8,
    model_name: str = "bert-base-uncased",
    epochs: int = 3,
) -> str:
    """
    Full ML pipeline: fetch -> split -> preprocess (parallel) -> merge ->
    train -> evaluate -> report.
    """

    # Phase 1: Data ingestion
    with flyte.group("data-ingestion"):
        raw_data = await fetch_dataset(source_url)
        shards = await split_into_shards(raw_data, num_shards=num_shards)

    # Phase 2: Parallel preprocessing via flyte.map
    with flyte.group("preprocessing"):
        processed_shards = await flyte.map(preprocess_shard, shards)
        merged = await merge_shards(processed_shards)
        splits = await create_train_val_split(merged)

    # Phase 3: Training (multiple model variants in parallel)
    with flyte.group("training"):
        small_model, large_model = await asyncio.gather(
            train_model(
                splits,
                model_name=model_name,
                epochs=epochs,
            ),
            train_model(
                splits,
                model_name="distilbert-base-uncased",
                epochs=epochs + 2,
                learning_rate=3e-5,
            ),
        )

    # Phase 4: Evaluation
    with flyte.group("evaluation"):
        eval_small, eval_large = await asyncio.gather(
            evaluate_model(small_model, splits),
            evaluate_model(large_model, splits),
        )
        comparison = await compare_models([eval_small, eval_large])

    # Phase 5: Report
    report = await generate_report(comparison, merged)

    return report


# =============================================================================
# Entry point
# =============================================================================

if __name__ == "__main__":
    flyte.run(run_training_pipeline(
        source_url="s3://datasets/text-classification/v2",
        num_shards=8,
        model_name="bert-base-uncased",
        epochs=3,
    ))
