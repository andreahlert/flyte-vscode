"""
Flyte V2 Deployment Script
===========================

Demonstrates flyte.deploy and flyte.build commands
that the extension integrates via CodeLens and CLI runner.
"""

import flyte

from pipeline import (
    data_env,
    train_env,
    distributed_env,
    run_training_pipeline,
    train_large_model,
)


# =============================================================================
# Deploy the standard pipeline
# =============================================================================

if __name__ == "__main__":
    # Build images for all environments
    flyte.build(data_env)
    flyte.build(train_env)

    # Deploy the main pipeline
    flyte.deploy(run_training_pipeline(
        source_url="s3://datasets/text-classification/v2",
        num_shards=16,
        model_name="bert-base-uncased",
        epochs=5,
    ))

    # Deploy the large model training separately
    flyte.deploy(train_large_model(
        train_data={
            "train_tokens": 10_000_000,
            "val_tokens": 1_000_000,
        },
        model_name="meta-llama/Llama-3-8B",
        epochs=1,
    ))
