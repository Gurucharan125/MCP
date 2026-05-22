from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
from .tools import all_tools, load_dynamic_tools

app = FastAPI(title="MCP Tools API Dashboard")

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)

@app.on_event("startup")
async def startup_event():
    load_dynamic_tools()

@app.get("/api/tools")
async def get_tools():
    """Return all available tools and their schemas."""
    tools_info = []
    for tool in all_tools:
        tools_info.append({
            "name": tool.name,
            "description": tool.description,
            "schema": tool.schema
        })
    return {"tools": tools_info}

class ExecuteRequest(BaseModel):
    arguments: Dict[str, Any]

@app.post("/api/tools/{tool_name}/execute")
async def execute_tool(tool_name: str, req: ExecuteRequest):
    """Execute a specific tool with the provided arguments."""
    tool_def = next((t for t in all_tools if t.name == tool_name), None)
    if not tool_def:
        raise HTTPException(status_code=404, detail="Tool not found")
        
    try:
        # Our tools execute synchronously in this implementation
        result = tool_def.execute(**req.arguments)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 