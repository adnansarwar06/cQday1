import httpx
import json

# The URL of your running FastAPI application
BASE_URL = "http://127.0.0.1:8000"


def run_default_case_test():
    """
    Tests the case study tool's fallback behavior. When no company is
    mentioned in the prompt, it should default to bloomreach.com.
    """
    endpoint = f"{BASE_URL}/case_studies_search"
    name = "Fallback to default 'bloomreach.com'"
    payload = {"user_prompt": "I just want to read some interesting customer stories."}
    expected_domain = "bloomreach.com"

    print(f"--- Running Test: {name} ---")
    print(f"Sending POST request to: {endpoint}")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        with httpx.Client() as client:
            response = client.post(endpoint, json=payload, timeout=30)
            response.raise_for_status()

            print("\nResponse:")
            response_data = response.json()
            print(json.dumps(response_data, indent=2))

            print("\nVerification:")
            if response_data.get("results"):
                all_urls_correct = all(
                    expected_domain in result.get("url", "")
                    for result in response_data["results"]
                )
                if all_urls_correct:
                    print(
                        f"✅ Success: All returned URLs are from '{expected_domain}'."
                    )
                else:
                    print(
                        f"❌ Failure: Some returned URLs are not from '{expected_domain}'."
                    )
            else:
                print(
                    f"ℹ️ Info: The search returned no results for '{expected_domain}'."
                )

    except httpx.HTTPStatusError as e:
        print(f"\n--- Error ---")
        print(f"Request failed with status code {e.response.status_code}")
        print(f"Response body: {e.response.text}")
    except httpx.RequestError as e:
        print(f"\n--- Error ---")
        print(f"An error occurred while requesting the server: {e}")
    finally:
        print("-" * (len(name) + 20))


if __name__ == "__main__":
    run_default_case_test()
