import flyte

env = flyte.TaskEnvironment(name="basic")


@env.task
async def hello(name: str) -> str:
    return f"Hello, {name}!"
