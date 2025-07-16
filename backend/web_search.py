import os
import httpx
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from typing import List, Optional
from bs4 import BeautifulSoup
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY")
BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search"

if not BRAVE_API_KEY:
    raise RuntimeError("BRAVE_API_KEY environment variable not set.")

# --- Pydantic Models ---
class WebSearchRequest(BaseModel):
    """Request model for the /web_search endpoint."""
    query: str = Field(..., description="The search query.")

class SearchResult(BaseModel):
    """Model for a single search result."""
    title: str
    url: Optional[str] = None
    summary: str
    extracted_content: Optional[str] = None

class WebSearchResponse(BaseModel):
    """Response model for the /web_search endpoint."""
    results: List[SearchResult]

# --- FastAPI Router ---
router = APIRouter()

# --- Helper Functions ---
async def fetch_search_results(query: str) -> List[dict]:
    """
    Calls the Brave Search API to get search results.

    Args:
        query: The search query string.

    Returns:
        A list of search result dictionaries from the Brave API.

    Raises:
        HTTPException: If the API call fails.
    """
    headers = {
        "X-Subscription-Token": BRAVE_API_KEY,
        "Accept": "application/json"
    }
    params = {"q": query}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(BRAVE_API_URL, headers=headers, params=params)
            response.raise_for_status()
            return response.json().get("web", {}).get("results", [])
        except httpx.HTTPStatusError as e:
            logger.error(f"Brave API request failed: {e}")
            raise HTTPException(status_code=e.response.status_code, detail="Error fetching search results from Brave API.")
        except httpx.RequestError as e:
            logger.error(f"An error occurred while requesting Brave API: {e}")
            raise HTTPException(status_code=500, detail="A network error occurred.")

async def extract_page_content(url: str) -> Optional[str]:
    """
    Extracts the main textual content from a given URL.
    This function is a placeholder for a more sophisticated scraper like ScraperJS.
    For now, it uses BeautifulSoup to get text content.

    Args:
        url: The URL of the webpage to scrape.

    Returns:
        The extracted text content, or None if extraction fails.
    """
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script_or_style in soup(["script", "style"]):
                script_or_style.decompose()
            
            # Get text
            text = soup.get_text()
            
            # Break into lines and remove leading/trailing space on each
            lines = (line.strip() for line in text.splitlines())
            # Break multi-headlines into a line each
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            # Drop blank lines
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            return text
    except httpx.HTTPStatusError as e:
        logger.warning(f"Failed to fetch {url} for scraping (status code: {e.response.status_code}).")
    except httpx.RequestError as e:
        logger.warning(f"Failed to fetch {url} for scraping: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during scraping of {url}: {e}")
    
    return None

async def none_coro():
    """A simple coroutine that returns None instantly."""
    return None

# --- API Endpoint ---
@router.post("/web_search", response_model=WebSearchResponse)
async def web_search(request: WebSearchRequest):
    """
    Performs a web search using the Brave Search API and optionally scrapes
    the content of the resulting pages concurrently.
    """
    brave_results = await fetch_search_results(request.query)
    
    tasks = []
    for result in brave_results:
        url = result.get("url")
        if url:
            tasks.append(extract_page_content(url))
        else:
            tasks.append(none_coro())

    all_extracted_contents = await asyncio.gather(*tasks)
    
    formatted_results = []
    for i, result in enumerate(brave_results):
        summary = result.get("description", "")
        url = result.get("url")
        
        formatted_results.append(
            SearchResult(
                title=result.get("title", "No Title"),
                url=url,
                summary=summary,
                extracted_content=all_extracted_contents[i],
            )
        )
        
    if not formatted_results:
        logger.info(f"No results found for query: '{request.query}'")

    return WebSearchResponse(results=formatted_results)

# --- Example Usage (for demonstration) ---
async def main_demo():
    """Demonstrates how to call the web_search endpoint."""
    # This is a demonstration function and would not be part of the production API.
    
    # Sample payload
    test_payload = {"query": "What is FastAPI?"}
    
    # In a real client, you would make an HTTP POST request to your running FastAPI app.
    # For example, using httpx:
    #
    # async with httpx.AsyncClient() as client:
    #     response = await client.post("http://127.0.0.1:8000/web_search", json=test_payload)
    #     print(response.json())
    
    # For this demo, we'll call the function directly.
    # Note: This requires the Brave API key to be set in the environment.
    if not BRAVE_API_KEY:
        print("Brave API key not found. Skipping demo.")
        return

    print("--- Running Web Search Demo ---")
    request = WebSearchRequest(**test_payload)
    response_data = await web_search(request)
    print("Search Query:", test_payload["query"])
    print("Results:")
    for res in response_data.results:
        print(f"  - Title: {res.title}")
        print(f"    URL: {res.url}")
        print(f"    Summary: {res.summary}")
        # print(f"    Extracted Content Length: {len(res.extracted_content) if res.extracted_content else 0}")
    print("--- Demo Finished ---")

if __name__ == "__main__":
    import asyncio
    # To run this demo, you need to have a .env file with your BRAVE_API_KEY
    # in the same directory, or have the environment variable set.
    asyncio.run(main_demo()) 