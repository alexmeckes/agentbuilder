# Any-Agent Framework Reference

This document preserves the original any-agent framework documentation for reference.

## About Any-Agent

`any-agent` is a Python library designed to provide a single interface to access many different agent frameworks.

Using `any-agent`, you can more easily switch to a new or different agent framework without needing to worry about the underlying API changes.

any-agent also provides a 'trace-first' [llm-as-a-judge powered evaluation tool](https://mozilla-ai.github.io/any-agent/evaluation/) for flexible evaluation of agent execution traces.

## Supported Frameworks

[![Google ADK](https://img.shields.io/badge/Google%20ADK-4285F4?logo=google&logoColor=white)](https://github.com/google/adk-python) [![LangChain](https://img.shields.io/badge/LangChain-1e4545?logo=langchain&logoColor=white)](https://github.com/langchain-ai/langgraph) [![LlamaIndex](https://img.shields.io/badge/🦙%20LlamaIndex-fbcfe2)](https://github.com/run-llama/llama_index) [![OpenAI Agents](https://img.shields.io/badge/OpenAI%20Agents-black?logo=openai)](https://github.com/openai/openai-agents-python) [![Smolagents](https://img.shields.io/badge/Smolagents-ffcb3a?logo=huggingface&logoColor=white)](https://smolagents.org/) [![TinyAgents](https://img.shields.io/badge/TinyAgents-ffcb3a?logo=huggingface&logoColor=white)](https://huggingface.co/blog/tiny-agents) [Agno AI](https://docs.agno.com/introduction)

## Requirements

- Python 3.11 or newer

## Installation

```bash
pip install 'any-agent[all]'
```

## Basic Usage

To define any agent system you will always use the same imports:

```python
from any_agent import AgentConfig, AnyAgent
```

For this example we use a model hosted by openai, but you may need to set the relevant API key for whichever provider being used.

```bash
export OPENAI_API_KEY="YOUR_KEY_HERE"  # or MISTRAL_API_KEY, etc
```

### Single agent

```python
from any_agent.tools import search_web, visit_webpage

agent = AnyAgent.create(
    "openai",  # See all options in https://mozilla-ai.github.io/any-agent/
    AgentConfig(
        model_id="gpt-4.1-nano",
        instructions="Use the tools to find an answer",
        tools=[search_web, visit_webpage]
    )
)

agent_trace = agent.run("Which Agent Framework is the best??")
print(agent_trace.final_output)
```

### Multi-agent

```python
from any_agent.tools import search_web, visit_webpage

agent = AnyAgent.create(
    "openai", # See all options in https://mozilla-ai.github.io/any-agent/
    AgentConfig(
        model_id="gpt-4.1-mini",
        instructions="You are the main agent. Use the other available agents to find an answer",
    ),
    managed_agents=[
        AgentConfig(
            name="search_web_agent",
            description="An agent that can search the web",
            model_id="gpt-4.1-nano",
            tools=[search_web]
        ),
        AgentConfig(
            name="visit_webpage_agent",
            description="An agent that can visit webpages",
            model_id="gpt-4.1-nano",
            tools=[visit_webpage]
        )
    ]
)

agent_trace = agent.run("Which Agent Framework is the best??")
print(agent_trace.final_output)
```

## Features

`any-agent` supports the use of Model Context Protocol (MCP) servers, and if the agent framework allows,
any LLM and provider using [LiteLLM](https://docs.litellm.ai/docs/) syntax.

Learn more in the docs:

- [Models](https://mozilla-ai.github.io/any-agent/agents/#model-id)
- [Tools](https://mozilla-ai.github.io/any-agent/tools/)
- [Instructions](https://mozilla-ai.github.io/any-agent/instructions/)
- [Tracing](https://mozilla-ai.github.io/any-agent/tracing/)
- [Evaluation](https://mozilla-ai.github.io/any-agent/evaluation/)

## Running in Jupyter Notebook

If running in Jupyter Notebook you will need to add the following two lines before running AnyAgent, otherwise you may see the error `RuntimeError: This event loop is already running`. This is a known limitation of Jupyter Notebooks, see [Github Issue](https://github.com/jupyter/notebook/issues/3397#issuecomment-376803076)

```python
import nest_asyncio
nest_asyncio.apply()
```

## Links

- [Official Documentation](https://mozilla-ai.github.io/any-agent/)
- [GitHub Repository](https://github.com/mozilla-ai/any-agent)
- [Blog Post Introduction](https://blog.mozilla.ai/introducing-any-agent-an-abstraction-layer-between-your-code-and-the-many-agentic-frameworks/) 