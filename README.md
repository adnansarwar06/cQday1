# AI Assistant with Tool Integration

A full-stack AI assistant application built with **Next.js** (frontend) and **FastAPI** (backend) that features dynamic tool integration and dual operational modes. The assistant can operate in Standard mode for simple interactions or Agent mode for complex multi-step reasoning with full execution tracing.

## ✨ Features

- **Dual Operation Modes**:
  - **Standard Mode**: Direct tool routing for single-step operations
  - **Agent Mode**: ReAct-style reasoning with multi-step problem solving
- **Dynamic Tool Management**: Enable/disable tools on demand through the UI
- **Real-time Tool Integration**: Web search, case studies, and file system operations
- **Execution Tracing**: Full visibility into agent reasoning process
- **Modern UI**: Built with Assistant-UI React components and Tailwind CSS
- **Secure File Operations**: Sandboxed file system access with path validation

## 🛠️ Available Tools

| Tool | Description | Capabilities |
|------|-------------|--------------|
| **Web Search** | Real-time web search | Up-to-date information retrieval |
| **Case Studies** | Company case study search | Access to business examples and analysis |
| **File Operations** | File system management | List, read, create, and edit files |

## 📁 Project Structure

```
work_trial_1/
├── backend/                    # FastAPI backend
│   ├── main.py                # Main FastAPI application
│   ├── assistant.py           # Assistant orchestrator
│   ├── agents.py              # Standard mode agent
│   ├── agent_react.py         # ReAct agent for multi-step reasoning
│   ├── tools.py               # Master tool registry
│   ├── web_search.py          # Web search tool
│   ├── case_studies.py        # Case studies tool
│   ├── file_tools.py          # File system tools
│   ├── file_tools_router.py   # File tools API endpoints
│   ├── llm.py                 # LLM integration
│   ├── requirements.txt       # Python dependencies
│   ├── knowledge_base/        # Read-only files directory
│   ├── output/                # Read/write files directory
│   └── tests/                 # Test files
└── frontend/                  # Next.js frontend
    ├── src/
    │   ├── app/               # Next.js app directory
    │   ├── components/        # React components
    │   │   ├── Assistant.tsx  # Main assistant component
    │   │   ├── AgentTrace.tsx # Reasoning trace display
    │   │   └── ui/            # UI components
    │   └── lib/               # Utilities
    ├── package.json           # Node.js dependencies
    └── tailwind.config.ts     # Tailwind configuration
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **OpenAI API Key** (required)
- **Serper API Key** (optional, for web search)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file:**
   Create a `.env` file in the `backend` directory:
   ```env
   # Required: OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL_NAME=gpt-4-1106-preview

   # Required: File System Tools
   FILE_TOOLS_KNOWLEDGE_BASE_PATH=./knowledge_base
   FILE_TOOLS_OUTPUT_PATH=./output

   # Optional: Web Search (requires Serper account)
   SERPER_API_KEY=your_serper_api_key_here

   # Optional: CORS configuration
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start the backend server:**
   ```bash
   uvicorn main:app --reload
   ```
   
   Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_ASSISTANT_API_URL=http://127.0.0.1:8000/v2/assistant
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   Frontend will be available at `http://localhost:3000`

## 📖 Usage

### Basic Chat
1. Open `http://localhost:3000` in your browser
2. Choose between **Standard** or **Agent** mode
3. Enable desired tools using the checkboxes
4. Start chatting with the assistant

### Mode Differences

**Standard Mode:**
- Single-step tool execution
- Direct responses
- Faster for simple queries

**Agent Mode:**
- Multi-step reasoning
- Shows thinking process
- Better for complex tasks
- Full execution trace available

### Example Interactions

**Web Search (Standard Mode):**
```
User: "What are the latest developments in AI?"
Assistant: [Searches web and provides current information]
```

**File Operations (Agent Mode):**
```
User: "Create a summary of all documents in knowledge_base"
Assistant: [Lists files → Reads each file → Creates comprehensive summary]
```

**Multi-tool Workflow (Agent Mode):**
```
User: "Research Netflix's business model and save key insights to a file"
Assistant: [Web search → Case study search → File creation with analysis]
```

## 🔧 API Reference

### Main Endpoint

**POST** `/v2/assistant`

```json
{
  "user_prompt": "Your question or request",
  "mode": "standard" | "agent",
  "enabled_tools": ["web_search", "case_studies_search", "list_files"]
}
```

**Response:** Server-sent events stream with content and trace data

### Direct API Usage

```bash
curl -X POST http://127.0.0.1:8000/v2/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "user_prompt": "Search for information about renewable energy",
    "mode": "agent",
    "enabled_tools": ["web_search", "case_studies_search"]
  }'
```

## 🛡️ Security Features

- **Path Validation**: All file operations are validated against path traversal attacks
- **Directory Sandboxing**: File access restricted to configured directories only
- **Tool Permissions**: Dynamic tool enabling/disabling for controlled access
- **Input Validation**: All API inputs validated using Pydantic models

## 🧪 Testing

**Backend Tests:**
```bash
cd backend
pytest
```

**File Tools Demo:**
```bash
cd backend
python test_file_tools_agent.py
```

## 🔧 Adding New Tools

### Backend
1. Create tool function and Pydantic models
2. Register in `backend/tools.py`:
   ```python
   register_tool(Tool(
       name="my_new_tool",
       description="Tool description and schema",
       coroutine=my_tool_function,
       request_model=MyToolRequest
   ))
   ```

### Frontend
1. Add to `availableTools` in `frontend/src/components/Assistant.tsx`:
   ```typescript
   { 
     name: "my_new_tool", 
     label: "My New Tool", 
     icon: "🔧", 
     description: "What this tool does" 
   }
   ```

## 📝 Environment Configuration

### Required API Keys

- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/account/api-keys)
- **Serper API Key**: Get from [Serper](https://serper.dev/) (optional, for web search)

### Directory Configuration

The file system tools create two directories:
- `knowledge_base/`: Read-only files for reference
- `output/`: Read/write directory for agent-created files

## 🐛 Troubleshooting

**Backend Issues:**
- Ensure `.env` file exists with required variables
- Check virtual environment is activated
- Verify API keys are valid

**Frontend Issues:**
- Ensure `.env.local` file exists
- Check backend is running on correct port
- Clear browser cache and restart dev server

**Tool Issues:**
- Verify tools are enabled in the UI
- Check backend logs for tool execution errors
- Ensure proper permissions for file operations

## 📚 Documentation

- **API Documentation**: Available at `http://localhost:8000/docs` when backend is running
- **Component Guide**: See `frontend/src/components/README.md` for UI component information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Submit a pull request

## 📄 License

This project is available for educational and development purposes. 