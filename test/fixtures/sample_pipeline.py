import flyte

env = flyte.TaskEnvironment(
    name="my-pipeline",
    image="auto",
    resources=flyte.Resources(cpu=1, memory="2Gi"),
    cache="auto",
)


@env.task
async def extract_data(source: str) -> dict:
    return {"data": source}


@env.task(retries=3, timeout=300)
async def transform_data(raw: dict) -> list:
    return list(raw.values())


@env.task
async def load_data(records: list) -> str:
    return f"Loaded {len(records)} records"


@env.task
async def run_pipeline(source: str) -> str:
    raw = await extract_data(source)
    transformed = await transform_data(raw)
    result = await load_data(transformed)
    return result


gpu_env = flyte.TaskEnvironment(
    name="gpu-training",
    image="auto",
    resources=flyte.Resources(cpu=4, memory="16Gi", gpu="A100:1"),
    secrets=flyte.Secret("wandb_key", group="ml"),
)


@gpu_env.task(cache=flyte.Cache(version="1.0"))
async def train_model(dataset: str, epochs: int = 10) -> str:
    return f"Model trained on {dataset} for {epochs} epochs"


app = flyte.app.AppEnvironment(
    name="my-api",
    port=8080,
    resources=flyte.Resources(cpu=2, memory="4Gi"),
)


if __name__ == "__main__":
    flyte.run(run_pipeline("s3://bucket/data"))
