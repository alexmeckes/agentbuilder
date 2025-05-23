# Placeholder for hello_agent.py

from any_agent import AgentConfig, AgentFramework, AnyAgent
import os


def run_hello_agent():
    # --- Configuration for the Agent ---
    # This example uses the OpenAI agent framework by default.
    #
    # REQUIRED: OpenAI API Key
    # You need to have an OpenAI API key set as an environment variable named OPENAI_API_KEY
    # or you can pass it directly in AgentConfig(api_key="YOUR_KEY").
    # Visit https://platform.openai.com/api-keys to get your key.
    #
    # By default, any-agent will try to read OPENAI_API_KEY from your environment.
    # If you want to use a different framework or model, see comments below.

    agent_framework = AgentFramework.OPENAI
    config = AgentConfig(
        model_id="gpt-3.5-turbo",  # A common and relatively cheap model
        instructions="You are a friendly assistant who loves to greet people.",
        name="HelloOpenAIAgent",
        tools=[],  # No tools needed for this simple greeting agent
        # api_key="sk-YOUR_OPENAI_API_KEY"  # Optionally, uncomment and set your key here
    )

    print(f"Creating agent '{config.name}' using {agent_framework.value} framework with model '{config.model_id}'...")

    # Check for API key if using OpenAI (or other keyed services)
    if agent_framework == AgentFramework.OPENAI and not (config.api_key or os.getenv("OPENAI_API_KEY")):
        print("\nERROR: OPENAI_API_KEY environment variable not set, and no api_key provided in AgentConfig.")
        print("Please set your OpenAI API key to run this example.")
        return

    try:
        # Create the agent instance
        agent = AnyAgent.create(
            agent_framework=agent_framework,
            agent_config=config
        )

        # Define the name to greet
        user_name = "World"
        prompt = f"Greet {user_name} enthusiastically with a short, cheerful message."

        print(f"Running agent with prompt: '{prompt}'")

        agent_trace = agent.run(prompt=prompt)

        print("\n--- Agent Response (Raw Trace) ---")
        print(agent_trace)
        print("---------------------------------")

        # Attempt to find a human-readable message in the trace
        response_message = "Could not extract a simple text response from the trace."
        if hasattr(agent_trace, 'output') and agent_trace.output:
            response_message = agent_trace.output
        elif hasattr(agent_trace, 'chat_history') and agent_trace.chat_history:
            last_message = agent_trace.chat_history[-1]
            if hasattr(last_message, 'content'):
                response_message = last_message.content

        print(f"\n--- Agent's Greeting ---")
        print(response_message)
        print("-------------------------")

        agent.exit()  # Clean up resources
        print("\nAgent run complete.")

    except ImportError as e:
        print(f"\nAn ImportError occurred: {e}")
        print(
            f"This might mean you are missing dependencies for the {agent_framework.value} framework."
        )
        print(f"Try installing them, e.g., for OpenAI: pip install openai")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        print("Please ensure your API key is valid and you have an internet connection.")
        print(f"If you changed the model_id ('{config.model_id}'), ensure it's available for your key.")


if __name__ == "__main__":
    run_hello_agent() 