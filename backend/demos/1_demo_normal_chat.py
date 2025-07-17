import requests
import json


def run_demo():
    """
    Demonstrates the simple agent's "Normal Chat Mode".
    """
    url = "http://127.0.0.1:8000/agent"
    user_prompt = "Explain the basics of transformers in large language models."

    payload = {"user_prompt": user_prompt}
    headers = {"Content-Type": "application/json"}

    print("--- DEMO 1: SIMPLE AGENT - NORMAL CHAT MODE ---")
    print(f"\nSending request to: {url}")
    print(f'User Prompt: "{user_prompt}"')

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes

        response_data = response.json()

        print("\nSUCCESS: Agent responded directly.")
        print("\nAgent's Final Answer:")
        print("-" * 25)
        print(response_data.get("response", "No response found."))
        print("-" * 25)

    except requests.exceptions.RequestException as e:
        print(f"\n--- ERROR ---")
        print(f"Failed to connect to the agent server at {url}.")
        print(
            "Please ensure the backend server is running with 'uvicorn main:app --reload'."
        )
        print(f"Error details: {e}")


if __name__ == "__main__":
    run_demo()
