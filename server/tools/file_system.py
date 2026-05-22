import os
import re
from . import Tool

def execute_read_file(path: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = f.read()
        return {"status": "success", "data": data, "message": f"Read file: {path}"}
    except Exception as e:
        return {"status": "error", "data": None, "message": str(e)}

def execute_list_files(path: str) -> dict:
    try:
        if not path:
            path = "."
        files = os.listdir(path)
        return {"status": "success", "data": files, "message": f"Listed directory: {path}"}
    except Exception as e:
        return {"status": "error", "data": None, "message": str(e)}

def execute_search_files(path: str, query: str) -> dict:
    try:
        if not path:
            path = "."
        files = os.listdir(path)
        filtered_files = [f for f in files if query in f]
        return {"status": "success", "data": filtered_files, "message": f"Searched for \"{query}\" in {path}"}
    except Exception as e:
        return {"status": "error", "data": None, "message": str(e)}

fileSystem_tools = [
    Tool(
        name="read_file",
        priority=9,
        description="Read a file from the local file system",
        match_rule=lambda q: bool(re.search(r'\b(read|open|show|display|cat)\b.*?\b[^\s]+\.\w+\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'\b(read|open|cat)\b.*?\b[^\s]+\.\w+\b', q, re.IGNORECASE) else 0.7,
        validation_rule=lambda res: res.get("status") == "success" and res.get("data") is not None and len(res.get("data")) > 0,
        schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "The path to the file to read"}
            },
            "required": ["path"]
        },
        execute=lambda **kwargs: execute_read_file(path=kwargs.get("path"))
    ),
    Tool(
        name="list_files",
        priority=8,
        description="List files in a directory",
        match_rule=lambda q: bool(re.search(r'\b(list|ls|dir)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 0.9 if re.search(r'\b(list|ls|dir)\b', q, re.IGNORECASE) else 0.6,
        validation_rule=lambda res: res.get("status") == "success" and isinstance(res.get("data"), list),
        schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "The path to the directory"}
            },
            "required": ["path"]
        },
        execute=lambda **kwargs: execute_list_files(path=kwargs.get("path"))
    ),
    Tool(
        name="search_files",
        priority=8,
        description="Search for files in a directory that match a query",
        match_rule=lambda q: bool(re.search(r'\bsearch\b.*?\bin\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'\bsearch\b.*?\bin\b', q, re.IGNORECASE) else 0.7,
        validation_rule=lambda res: res.get("status") == "success" and isinstance(res.get("data"), list),
        schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "The path to the directory"},
                "query": {"type": "string", "description": "The search query substring"}
            },
            "required": ["path", "query"]
        },
        execute=lambda **kwargs: execute_search_files(path=kwargs.get("path"), query=kwargs.get("query"))
    )
]
