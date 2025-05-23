# Hello Agent Example

This is a basic example to demonstrate the fundamentals of the `any-agent` framework. It uses the `OpenAIAgent` implementation by default, which requires an OpenAI API key.

## Prerequisites

1.  **Install `any-agent` framework**:
    Follow the installation instructions in the main `README.md` of this project.
    You will also need the specific dependencies for the OpenAI framework. If not already installed as part of `any-agent`'s core dependencies, you might need to install them:
    ```bash
    pip install openai # Or litellm if OpenAI support goes through it
    ```
    (Check the `any-agent` documentation for the recommended way to install provider-specific dependencies).

2.  **Set up OpenAI API Key**:
    *   You need an API key from OpenAI. If you don't have one, you can get it from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
    *   The agent script expects the API key to be available as an environment variable named `OPENAI_API_KEY`.
        ```bash
        export OPENAI_API_KEY="your_openai_api_key_here"
        ```
    *   Alternatively, you can modify `hello_agent.py` to pass the `api_key` directly in the `AgentConfig`, but using environment variables is generally recommended for security.

## How to Run

1.  Ensure your `OPENAI_API_KEY` environment variable is set.

2.  Navigate to the example directory:
    ```bash
    cd examples/hello_agent
    ```

3.  Run the agent script:
    ```bash
    python hello_agent.py
    ```

    You should see output indicating the agent is being created, followed by the agent running, the raw trace output, and finally, the friendly greeting from the agent.

## Understanding the Code (`hello_agent.py`)

*   **Configuration (`AgentConfig`)**: Defines the agent's properties:
    *   `model_id`: Set to `gpt-3.5-turbo` (a common OpenAI model).
    *   `instructions`: A system prompt like "You are a friendly assistant...".
    *   `name`: "HelloOpenAIAgent".
    *   `api_key`: The script primarily relies on the `OPENAI_API_KEY` environment variable, but `AgentConfig` can also accept an `api_key` directly.
*   **Framework Selection (`AgentFramework.OPENAI`)**: Specifies that we want to use the `OpenAIAgent` implementation.
*   **Agent Creation (`AnyAgent.create`)**: The factory method used to instantiate the configured OpenAI agent.
*   **Running the Agent (`agent.run`)**: The agent is given a prompt (e.g., "Greet World enthusiastically...") and processes it using the configured OpenAI model.
*   **Output (`AgentTrace`)**: The `run` method returns an `AgentTrace` object. The script prints this raw trace and then attempts to extract and print the main textual response.
*   **Cleanup (`agent.exit`)**: Releases any resources held by the agent.

## Using Other Frameworks

While this example defaults to OpenAI, `any-agent` is designed to work with multiple frameworks. To use a different one (e.g., `TinyAgent` with a local Ollama model, or Google's `VertexAI`):

1.  **Modify `agent_framework`**: Change `AgentFramework.OPENAI` to, for example, `AgentFramework.TINYAGENT` or `AgentFramework.GOOGLE`.
2.  **Adjust `AgentConfig`**: 
    *   Update `model_id` to one compatible with the chosen framework.
    *   Set `api_base` if needed (e.g., for local models with Ollama: `api_base="http://localhost:11434"`).
    *   Provide an `api_key` if the new framework requires one (and it's different from `OPENAI_API_KEY` or not handled by `litellm`'s environment variable conventions).
    *   Update the agent `name` if desired.
3.  **Install Dependencies**: Ensure you have any necessary client libraries for the new framework (e.g., `pip install google-generativeai` for some Google models).
4.  **Environment Variables**: Set any required environment variables for the new framework (e.g., `GOOGLE_API_KEY`).

Refer to the comments in `hello_agent.py` and the main `any-agent` documentation for more details on configuring different frameworks and models. 