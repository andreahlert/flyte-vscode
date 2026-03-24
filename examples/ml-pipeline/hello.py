"""
Simple Flyte V2 example for testing remote execution.
No GPU, no secrets, no external dependencies.
"""

import flyte

env = flyte.TaskEnvironment(
    name="hello",
)


@env.task
async def greet(name: str = "World") -> str:
    """Say hello."""
    return f"Hello, {name}!"


@env.task
async def add(a: int = 2, b: int = 3) -> int:
    """Add two numbers."""
    return a + b


@env.task
async def pipeline(name: str = "Flyte") -> str:
    """Run greet and add together."""
    greeting = await greet(name)
    result = await add(10, 20)
    return f"{greeting} Result: {result}"


if __name__ == "__main__":
    flyte.run(pipeline())
