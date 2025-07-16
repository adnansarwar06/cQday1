import re
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging
from urllib.parse import urlparse
from collections import Counter

from web_search import web_search, WebSearchRequest, WebSearchResponse
from llm import get_openai_response_non_stream, LLMProviderError

# Configure logging
logger = logging.getLogger(__name__)

# --- Pydantic Models ---
class CaseStudyRequest(BaseModel):
    """Request model for the /case_studies_search endpoint."""
    user_prompt: str = Field(..., description="The user's full request for a case study, which should mention the target company.")

# --- System Prompt for LLM ---
GENERATE_SEARCH_QUERY_PROMPT_TEMPLATE = """
Based on the following user request, generate a concise and effective search query to find a relevant case study.
The query should be just a few keywords. Do not include 'site:' or the company name in your query.

User Request: "{user_prompt}"

Search Query:
"""

# --- FastAPI Router ---
router = APIRouter()

# --- Helper Functions ---
def extract_company_from_prompt(prompt: str) -> Optional[str]:
    """
    Extracts a company name from the user prompt using regex.
    Looks for patterns like '... at <company>' or '... from <company>'.
    
    Args:
        prompt: The user's input string.
        
    Returns:
        The extracted company name or None if not found.
    """
    # This regex looks for a company name following "at", "from", "for", or "with".
    # It captures a sequence of capitalized words.
    patterns = [
        r"(?:at|from|for|with)\s+([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)*)"
    ]
    for pattern in patterns:
        match = re.search(pattern, prompt)
        if match:
            company_name = match.group(1).strip()
            logger.info(f"Extracted company '{company_name}' from prompt.")
            return company_name
    logger.info("No company name found in prompt.")
    return None

# A mapping for common company names whose domains are not obvious
KNOWN_DOMAIN_EXCEPTIONS = {
    "google cloud": "cloud.google.com",
    "aws": "aws.amazon.com",
    "amazon web services": "aws.amazon.com",
    "azure": "azure.microsoft.com"
}

def extract_domain(company: str) -> str:
    """
    Extracts a clean domain from a company name or URL.
    Checks against a list of known exceptions first.
    """
    lower_company = company.lower().strip()
    if lower_company in KNOWN_DOMAIN_EXCEPTIONS:
        return KNOWN_DOMAIN_EXCEPTIONS[lower_company]
        
    # Remove protocol if present
    if company.startswith(("http://", "https://")):
        company = company.split('//')[1]
    
    # Remove path if present
    company = company.split('/')[0]
    
    # Remove www. if present
    if company.lower().startswith("www."):
        company = company[4:]
        
    # If it's just a name (e.g., "Bloomreach"), assume it's a .com
    # A more robust solution might use a third-party API to find the domain
    if '.' not in company:
        return f"{company.lower().replace(' ', '')}.com"
        
    return company.lower()

def extract_base_domain(url: str) -> Optional[str]:
    """Extracts the network location (domain) from a URL."""
    if not url:
        return None
    try:
        return urlparse(url).netloc
    except Exception:
        return None

async def find_company_domain_via_search(company_name: str) -> Optional[str]:
    """
    Uses the web search tool to find the official domain for a company
    by analyzing the top search results for a consensus.
    """
    logger.info(f"Performing pre-search to find domain for '{company_name}'...")
    # A simple query with just the company name is often most effective.
    pre_search_query = f"{company_name}"
    search_request = WebSearchRequest(query=pre_search_query)
    
    try:
        response = await web_search(search_request)
        if response.results:
            # Analyze the top 5 results to find the most common domain.
            domains = []
            for result in response.results[:5]:
                if result.url:
                    domain = extract_base_domain(result.url)
                    # Filter out common noise like social media, news, etc.
                    if domain and not any(noise in domain for noise in ["youtube.com", "wikipedia.org", "linkedin.com", "facebook.com", "twitter.com"]):
                        domains.append(domain)
            
            if not domains:
                logger.warning(f"Could not extract any valid domains from pre-search for '{company_name}'.")
                return None

            # Count the occurrences and return the most common one.
            domain_counts = Counter(domains)
            most_common_domain = domain_counts.most_common(1)[0][0]
            
            logger.info(f"Consensus domain for '{company_name}': {most_common_domain}")
            return most_common_domain

    except Exception as e:
        logger.error(f"Pre-search for domain failed for '{company_name}': {e}")
    
    logger.warning(f"Could not find a domain for '{company_name}'.")
    return None


# --- API Endpoint ---
@router.post("/case_studies_search", response_model=WebSearchResponse)
async def case_studies_search(request: CaseStudyRequest):
    """
    Performs a domain-scoped search for case studies by:
    1. Extracting the company from the prompt.
    2. Using a pre-search to dynamically find the company's domain.
    3. Using an LLM to generate a search query from the user prompt.
    4. Scoping the LLM-generated query to the discovered domain.
    """
    company_name = extract_company_from_prompt(request.user_prompt)
    
    if company_name:
        target_domain = await find_company_domain_via_search(company_name)
        if not target_domain:
            # Fallback if pre-search fails
            logger.warning(f"Could not dynamically find domain for '{company_name}', falling back to .com guess.")
            target_domain = extract_domain_simple(company_name)
    else:
        target_domain = "bloomreach.com"
        logger.info("No company in prompt, defaulting to bloomreach.com")
        
    # Step 1: Use LLM to generate the base search query
    try:
        llm_prompt = GENERATE_SEARCH_QUERY_PROMPT_TEMPLATE.format(user_prompt=request.user_prompt)
        search_query = await get_openai_response_non_stream(llm_prompt)
        # Clean up the query
        search_query = search_query.strip().replace('"', '')
        logger.info(f"LLM generated search query: '{search_query}'")
    except LLMProviderError as e:
        logger.error(f"LLM query generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate search query from LLM.")
        
    # Step 2 & 3: Combine the LLM query and the discovered domain
    scoped_query = f'{search_query} site:{target_domain}'
    logger.info(f"Final scoped query: '{scoped_query}'")
    
    search_request = WebSearchRequest(query=scoped_query)
    
    try:
        response = await web_search(search_request)
        
        filtered_results = [
            result for result in response.results 
            if result.url and target_domain in result.url
        ]
        
        response.results = filtered_results
        
        if not response.results:
            logger.warning(f"No case studies found for domain '{target_domain}' with query '{scoped_query}'")
            
        return response
        
    except Exception as e:
        logger.error(f"An error occurred during case study search: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while searching for case studies.")

# Renaming the old simple extractor
def extract_domain_simple(company: str) -> str:
    """
    A simple (naive) function to guess a domain from a company name.
    """
    if '.' not in company:
        return f"{company.lower().replace(' ', '')}.com"
    return company.lower() 