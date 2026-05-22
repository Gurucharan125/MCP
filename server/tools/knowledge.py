import re
from . import Tool

def execute_faq(query: str) -> dict:
    faqs = {
        "what is OutLine": "Outline View: This view displays the symbol tree/file component structure of the currently active editor.It is enabled by default in the latest version of VS Code. You can open it by clicking on the Outline icon in the Activity Bar on the side of the editor.",
        "what is mcp": "MCP is a protocol that allows AI models to interact with external tools like files, APIs, and databases.",
        "what is node-fetch": "node-fetch is a library that allows you to make HTTP requests in Node.js.",
        "what is fs": "fs is a built-in Node.js module that provides functionality for working with the file system.",
        "what is createserver": "createServer is a function from the @modelcontextprotocol/sdk library that creates an MCP server.",
        "what is server.tool": "server.tool is a function from the @modelcontextprotocol/sdk library that registers a tool with the MCP server.",
        "what is server.serve": "server.serve is a function from the @modelcontextprotocol/sdk library that starts the MCP server."
    }
    stop_words = {"what", "is", "does", "the", "a", "an", "how", "why", "do", "can", "mean", "stand", "for", "about", "tell", "me", "explain", "describe"}
    
    q = re.sub(r'[?!.,]', '', (query or "").lower()).strip()
    q_words = [w for w in q.split() if w not in stop_words]
    
    best_match = None
    best_score = 0
    
    for key, value in faqs.items():
        key_words = [w for w in key.lower().split() if w not in stop_words]
        overlap = sum(1 for kw in key_words if any(kw in qw or qw in kw for qw in q_words))
        if overlap > best_score:
            best_score = overlap
            best_match = key
            
    answer = faqs[best_match] if best_match and best_score > 0 else "I'm sorry, I don't know the answer to that FAQ."
    return {"status": "success", "data": answer, "message": "FAQ result"}

knowledge_tools = [
    Tool(
        name="faq",
        priority=7,
        description="Get answers to frequently asked questions. Use this FIRST for any 'what is X' question.",
        match_rule=lambda q: bool(re.search(r'\b(what\s+is|who\s+is|explain|describe)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 0.9 if re.search(r'\b(what\s+is|outline|mcp|node-fetch|fs|createserver)\b', q, re.IGNORECASE) else 0.6,
        validation_rule=lambda res: res.get("status") == "success" and "I don't know the answer" not in res.get("data", ""),
        schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The question to ask"}
            },
            "required": ["query"]
        },
        execute=lambda **kwargs: execute_faq(query=kwargs.get("query"))
    )
]
