import os
import logging
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from starlette.responses import StreamingResponse
from typing import List, Dict, Any
from pydantic import BaseModel


from llm import get_openai_completion, LLMProviderError
from web_search import router as web_search_router
from case_studies import router as case_studies_router
from file_tools_router import router as file_tools_router
from assistant import AssistantRequest, run_assistant_streaming


load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the File Tools router for direct API access
app.include_router(file_tools_router)

# The old routers can be kept for now or removed if they are no longer needed.
# app.include_router(web_search_router)
# app.include_router(case_studies_router)


class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint to handle chat requests.
    It uses the LLM to generate a response and streams it back to the client.
    """
    async def event_generator():
        try:
            async for chunk in get_openai_completion(request.messages):
                yield chunk
        except LLMProviderError as e:
            print(f"Error: {e}")
            # Yield a JSON object with an error message
            yield f'{{"error": "{str(e)}"}}'

    return EventSourceResponse(event_generator())


@app.post("/v2/assistant")
async def assistant_endpoint(request: AssistantRequest):
    """
    This is the new unified endpoint for all assistant interactions.
    It uses the orchestrator in assistant.py to route to the correct
    agent (Simple or ReAct) based on the request's `mode` and `enabled_tools`.
    This endpoint is compliant with the Vercel AI SDK streaming protocol.
    """
    logger.info(f"Backend - Received request with mode: {request.mode}, tools: {request.enabled_tools}")
    logger.info(f"Backend - Number of messages: {len(request.messages)}")
    for i, msg in enumerate(request.messages):
        logger.info(f"Backend - Message {i}: role={msg.role}, content_type={type(msg.content)}")
    async def event_generator():
        try:
            # Stream responses using Vercel AI SDK data stream protocol
            async for chunk in run_assistant_streaming(request):
                if chunk["type"] == "content":
                    # Text part format: 0:string\n
                    yield f"0:{json.dumps(chunk['content'])}\n"
                elif chunk["type"] == "trace":
                    # Data part format: 2:Array<JSONValue>\n
                    yield f"2:{json.dumps([chunk['data']])}\n"
            
            # Finish message part format: d:{finishReason, usage}\n
            yield f'd:{json.dumps({"finishReason": "stop", "usage": {"promptTokens": 0, "completionTokens": 0}})}\n'
            
        except Exception as e:
            logger.error(f"Error in assistant endpoint: {e}", exc_info=True)
            # Error part format: 3:string\n
            yield f"3:{json.dumps(str(e))}\n"

    return StreamingResponse(
        event_generator(), 
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "x-vercel-ai-data-stream": "v1",
        }
    )


@app.get("/")
def read_root():
    return {"Hello": "World"} 