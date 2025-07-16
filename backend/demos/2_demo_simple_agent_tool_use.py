import requests
import json

def run_demo():
    """
    Demonstrates the simple agent's "Agent Mode" with a single tool call.
    """
    url = "http://127.0.0.1:8000/agent"
    user_prompt = "What are the top headlines on The Verge right now?"
    
    payload = {"user_prompt": user_prompt}
    headers = {"Content-Type": "application/json"}
    
    print("--- DEMO 2: SIMPLE AGENT - SINGLE TOOL USE ---")
    print(f"\nSending request to: {url}")
    print(f"User Prompt: \"{user_prompt}\"")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        response_data = response.json()
        
        print("\nSUCCESS: Agent used a tool.")
        print("\nTool's Direct Output:")
        print("-" * 25)
        # The response is a stringified list of results, so we pretty-print it.
        try:
            # Attempt to parse the string into a list for pretty printing
            pretty_output = json.loads(response_data.get("response", "[]").replace("'", "\""))
            print(json.dumps(pretty_output, indent=2))
        except:
            # Fallback for any other string format
            print(response_data.get("response", "No response found."))

        print("-" * 25)
        
    except requests.exceptions.RequestException as e:
        print(f"\n--- ERROR ---")
        print(f"Failed to connect to the agent server at {url}.")
        print("Please ensure the backend server is running with 'uvicorn main:app --reload'.")
        print(f"Error details: {e}")

if __name__ == "__main__":
    run_demo() 