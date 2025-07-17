import requests
import json


def run_demo():
    """
    Demonstrates the advanced ReAct agent's multi-step reasoning.
    """
    url = "http://127.0.0.1:8000/react-agent"
    user_prompt = "I want to find case studies about the company that makes the Snowflake Data Cloud."

    payload = {"user_prompt": user_prompt}
    headers = {"Content-Type": "application/json"}

    print("--- DEMO 3: ADVANCED REACT AGENT - MULTI-STEP REASONING ---")
    print(f"\nSending request to: {url}")
    print(f'User Prompt: "{user_prompt}"')

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        response_data = response.json()

        print("\n--- AGENT'S FULL EXECUTION TRACE ---")
        for i, step in enumerate(response_data.get("trace", [])):
            print(f"\n[Trace Step {i+1}: {step['step_type']}]")
            if "tool_name" in step:
                print(f"Tool: {step['tool_name']}")
                print(f"Input: {json.dumps(step['tool_input'], indent=2)}")
            else:
                # Handle pretty printing for Thought and Observation steps
                output = step.get("output", "")
                try:
                    # Check if the output is a stringified JSON list
                    if output.strip().startswith("Observation: results=["):
                        results_str = output.replace(
                            "Observation: results=", ""
                        ).replace("'", '"')
                        parsed_results = json.loads(results_str)
                        print(
                            f"Output:\nObservation: results=\n{json.dumps(parsed_results, indent=2)}"
                        )
                    else:
                        print(f"Output:\n{output}")
                except (json.JSONDecodeError, TypeError):
                    print(f"Output:\n{output}")

        print("\n\n--- AGENT'S FINAL ANSWER ---")
        print("-" * 28)
        print(response_data.get("final_answer", "No final answer found."))
        print("-" * 28)

    except requests.exceptions.RequestException as e:
        print(f"\n--- ERROR ---")
        print(f"Failed to connect to the agent server at {url}.")
        print(
            "Please ensure the backend server is running with 'uvicorn main:app --reload'."
        )
        print(f"Error details: {e}")


if __name__ == "__main__":
    run_demo()
