from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pytest
from main import app

# Create a TestClient instance for making requests to the FastAPI app
client = TestClient(app)

@pytest.fixture
def mock_llm_completion():
    """
    Pytest fixture to mock the get_openai_completion function.
    This prevents actual API calls during testing.
    """
    with patch("main.get_openai_completion") as mock:
        yield mock

# def test_chat_endpoint_success(mock_llm_completion: MagicMock):
#     """
#     Tests the /chat endpoint for a successful request.
#     It mocks the LLM call and verifies that the endpoint returns the
#     expected response and status code.
#     """
#     # Configure the mock to return a specific value
#     mock_llm_completion.return_value = "This is a mocked response."

#     # Define the request payload
#     request_payload = {
#         "messages": [{"role": "user", "content": "Hello"}]
#     }

#     # Make a POST request to the /chat endpoint
#     response = client.post("/chat", json=request_payload)

#     # Assert that the response is successful
#     assert response.status_code == 200
#     response_data = response.json()
#     assert response_data["role"] == "assistant"
#     assert response_data["content"] == "This is a mocked response."

#     # Assert that the mocked function was called correctly
#     mock_llm_completion.assert_called_once_with(
#         messages=[{"role": "user", "content": "Hello"}]
#     )

# def test_chat_endpoint_llm_provider_error(mock_llm_completion: MagicMock):
#     """
#     Tests the /chat endpoint for a scenario where the LLM provider fails.
#     It configures the mock to raise an LLMProviderError and verifies
#     that the endpoint returns a 500 Internal Server Error.
#     """
#     from llm import LLMProviderError

#     # Configure the mock to raise an exception
#     mock_llm_completion.side_effect = LLMProviderError("LLM API is down")

#     request_payload = {
#         "messages": [{"role": "user", "content": "Hello"}]
#     }

#     response = client.post("/chat", json=request_payload)

#     assert response.status_code == 500
#     assert "LLM API is down" in response.json()["detail"] 