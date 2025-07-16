# Frontend Component Guide

This guide explains how to add new tools to the AI Assistant's user interface.

## 🛠️ Adding New Tools

To add a new tool to the assistant, you only need to modify **one file**:

**`frontend/src/components/Assistant.tsx`**

### Steps to Add a Tool

1. **Open `Assistant.tsx`**: Navigate to the main assistant component file.

2. **Update `availableTools`**: Find the `availableTools` array and add your new tool:

```typescript
const availableTools = [
  { name: "web_search", label: "Web Search", icon: "🔍", description: "Search the web for real-time information" },
  { name: "case_studies_search", label: "Case Studies", icon: "📚", description: "Access relevant case studies and examples" },
  { name: "list_files", label: "List Files", icon: "📁", description: "List files in directories" },
  { name: "read_file", label: "Read File", icon: "📄", description: "Read and display file contents" },
  { name: "create_file", label: "Create File", icon: "✏️", description: "Create new files with content" },
  { name: "edit_file", label: "Edit File", icon: "📝", description: "Edit existing file contents" },
  // Add your new tool here:
  { name: "your_tool_name", label: "Your Tool Display Name", icon: "🔧", description: "What your tool does" },
];
```

### Tool Object Properties

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `name` | string | Tool identifier (must match backend `TOOL_REGISTRY`) | ✅ |
| `label` | string | User-friendly display name | ✅ |
| `icon` | string | Emoji or icon for the tool | ✅ |
| `description` | string | Brief description shown in tooltip | ✅ |

### Example: Adding a Code Interpreter Tool

```typescript
// Before
const availableTools = [
  { name: "web_search", label: "Web Search", icon: "🔍", description: "Search the web for real-time information" },
  { name: "case_studies_search", label: "Case Studies", icon: "📚", description: "Access relevant case studies and examples" },
];

// After
const availableTools = [
  { name: "web_search", label: "Web Search", icon: "🔍", description: "Search the web for real-time information" },
  { name: "case_studies_search", label: "Case Studies", icon: "📚", description: "Access relevant case studies and examples" },
  { name: "code_interpreter", label: "Code Interpreter", icon: "💻", description: "Execute and analyze code snippets" },
];
```

## 🎯 How It Works

1. **Automatic UI Generation**: The UI automatically generates checkboxes for each tool in the toolbar
2. **Dynamic Tool Management**: Users can enable/disable tools through the interface
3. **Backend Integration**: Enabled tools are sent to the backend with each request
4. **Tool Validation**: Backend validates that requested tools exist in `TOOL_REGISTRY`

## 🔧 UI Components Overview

### Core Components

- **`Assistant.tsx`**: Main orchestrator component
- **`AgentTrace.tsx`**: Displays ReAct agent reasoning steps
- **`Toolbar.tsx`**: Tool selection and mode switching interface

### UI Component Structure

```
Assistant.tsx
├── Header (title and description)
├── Toolbar (mode toggle + tool checkboxes)
├── Chat Interface (Thread from @assistant-ui/react-ui)
└── Agent Trace (collapsible reasoning display)
```

## 🎨 UI Features

### Mode Selection
- **Standard Mode**: Single-step tool execution, faster responses
- **Agent Mode**: Multi-step reasoning with full trace visibility

### Tool Management
- **Checkboxes**: Individual tool enable/disable controls
- **Visual Feedback**: Icons and descriptions for each tool
- **Tooltips**: Hover descriptions for tool capabilities

### Trace Display
- **Collapsible**: Show/hide agent reasoning steps
- **Step-by-step**: View agent's thought process
- **Only in Agent Mode**: Trace only appears for ReAct agent responses

## 💡 Best Practices

### Tool Naming
- Use **snake_case** for tool names (matches Python backend)
- Use **Title Case** for labels (user-friendly display)
- Choose **relevant emojis** for visual identification

### Tool Descriptions
- Keep descriptions **brief** (under 50 characters)
- Focus on **what the tool does**, not how it works
- Use **action words** (Search, Create, Analyze, etc.)

### Icon Selection
- Use **recognizable emojis** that represent the tool's function
- Maintain **visual consistency** across similar tools
- Consider **accessibility** - emojis should make sense to all users

## 🔄 Environment Configuration

Create `.env.local` in the frontend directory:

```env
# Required: Assistant API endpoint
NEXT_PUBLIC_ASSISTANT_API_URL=http://127.0.0.1:8000/v2/assistant

# Optional: Environment indicator
NEXT_PUBLIC_ENVIRONMENT=development
```

## 🧪 Testing New Tools

1. **Add tool to frontend** following the steps above
2. **Ensure backend tool is registered** in `backend/tools.py`
3. **Test in both modes**:
   - Standard mode for simple usage
   - Agent mode for complex multi-step scenarios
4. **Verify UI behavior**:
   - Tool checkbox appears
   - Tool can be enabled/disabled
   - Tool works when selected

## 🚨 Common Issues

**Tool not appearing in UI:**
- Check spelling of tool name
- Ensure tool object is properly formatted
- Verify no syntax errors in `availableTools` array

**Tool not working when selected:**
- Verify tool is registered in backend `TOOL_REGISTRY`
- Check backend logs for tool execution errors
- Ensure tool name matches exactly between frontend and backend

**UI not updating:**
- Clear browser cache
- Restart Next.js development server
- Check browser console for JavaScript errors

## 📚 Additional Resources

- **Backend Tool Guide**: See `backend/tools.py` for tool registration
- **Assistant-UI Documentation**: [https://github.com/Yonom/assistant-ui](https://github.com/Yonom/assistant-ui)
- **API Reference**: Available at `http://localhost:8000/docs` when backend is running

The frontend component system is designed to be simple and maintainable - adding a new tool requires only a single line change in most cases! 