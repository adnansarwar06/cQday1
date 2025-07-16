import httpx
import json

# The URL of your running FastAPI application
BASE_URL = "http://127.0.0.1:8000"

def test_web_search():
    """
    Sends a test request to the /web_search endpoint and prints the response.
    """
    endpoint = f"{BASE_URL}/web_search"
    payload = {"query": "What are the latest advancements in AI?"}
    
    print(f"Sending POST request to: {endpoint}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        with httpx.Client() as client:
            response = client.post(endpoint, json=payload, timeout=30)
            
            # Raise an exception for bad status codes (4xx or 5xx)
            response.raise_for_status()
            
            print("\n--- Response ---")
            # Pretty-print the JSON response
            print(json.dumps(response.json(), indent=2))
            
    except httpx.HTTPStatusError as e:
        print(f"\n--- Error ---")
        print(f"Request failed with status code {e.response.status_code}")
        print(f"Response body: {e.response.text}")
    except httpx.RequestError as e:
        print(f"\n--- Error ---")
        print(f"An error occurred while requesting the server: {e}")
    except json.JSONDecodeError:
        print(f"\n--- Error ---")
        print("Failed to decode JSON from response. Raw response:")
        print(response.text)

if __name__ == "__main__":
    test_web_search() 