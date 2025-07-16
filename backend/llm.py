"""
This module handles the interaction with the OpenAI Large Language Model (LLM).

It provides a unified interface to communicate with the OpenAI API and includes
error handling and configuration management for the API key and model name.
"""

import os
from openai import AsyncOpenAI
from dotenv import load_dotenv
from typing import List, Dict, Any, AsyncGenerator

# Load environment variables from .env file
load_dotenv()

# Get the API key and model name from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME", "gpt-4.1-mini") # Default to gpt-4.1-mini

# Raise an error if the API key is not set
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is not set in the environment. Please add it to your .env file.")

# Create the async OpenAI client
client = AsyncOpenAI(api_key=OPENAI_API_KEY)


class LLMProviderError(Exception):
    """Custom exception for errors related to the LLM provider."""
    pass


async def get_openai_completion(messages: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
    """
    Gets a streaming chat completion from the OpenAI API.

    Args:
        messages: A list of message dictionaries, where each dictionary
                  has a "role" and "content" key.

    Yields:
        The content chunks of the assistant's response message.

    Raises:
        LLMProviderError: If the OpenAI API call fails.
    """
    try:
        stream = await client.chat.completions.create(
            model=OPENAI_MODEL_NAME,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
    except Exception as e:
        raise LLMProviderError(f"OpenAI API request failed: {e}")

async def get_openai_response_non_stream(prompt: str) -> str:
    """
    Gets a single, non-streaming response from the OpenAI API.

    Args:
        prompt: A single string prompt to send to the LLM.

    Returns:
        The LLM's response as a single string.

    Raises:
        LLMProviderError: If the OpenAI API call fails.
    """
    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            stream=False,
        )
        content = response.choices[0].message.content
        if content:
            return content
        raise LLMProviderError("OpenAI API returned an empty response.")
    except Exception as e:
        raise LLMProviderError(f"OpenAI API request failed: {e}") 