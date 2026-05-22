import json
from typing import Dict, Any, Union, List

def format_tool_result(query: str, tool_result: Dict[str, Any]) -> str:
    if tool_result.get("status") == "error":
        return f"❌ Error: {tool_result.get('message', 'Unknown error')}"
        
    data = tool_result.get("data")
    message = tool_result.get("message", "Done.")
    
    if data is None:
        return message
        
    if isinstance(data, (str, int, float, bool)):
        return f"{message}\n\n{data}"
        
    if isinstance(data, list):
        if len(data) == 0:
            return message if tool_result.get("message") else "No results found."
            
        if isinstance(data[0], dict):
            keys = data[0].keys()
            rows = []
            for i, row in enumerate(data):
                row_str = " | ".join([f"{k}: {row.get(k, '')}" for k in keys])
                rows.append(f"{i + 1}. {row_str}")
            return f"{message}\n\n" + "\n".join(rows)
            
        return f"{message}\n\n" + "\n".join([f"• {item}" for item in data])
        
    if isinstance(data, dict):
        entries = "\n".join([f"• {k}: {v}" for k, v in data.items()])
        return f"{message}\n\n{entries}"
        
    return message or json.dumps(data)
