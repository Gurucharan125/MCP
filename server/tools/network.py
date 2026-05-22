import re
import requests
import json
from . import Tool

def execute_fetch_url(url: str, maxLength: int = 10000) -> dict:
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        content_type = response.headers.get("content-type", "")
        
        if "application/json" in content_type:
            data = response.json()
            result = json.dumps(data)
        else:
            text = response.text
            if "text/html" in content_type:
                # Remove script and style tags
                text = re.sub(r'<script[^>]*>[\s\S]*?<\/script>', '', text, flags=re.IGNORECASE)
                text = re.sub(r'<style[^>]*>[\s\S]*?<\/style>', '', text, flags=re.IGNORECASE)
                # Remove HTML tags
                text = re.sub(r'<[^>]*>?', '', text)
                # Collapse whitespace
                text = re.sub(r'\s+', ' ', text).strip()
            result = text
            
        return {
            "status": "success", 
            "data": result[:maxLength], 
            "message": f"Fetched content from {url}"
        }
    except Exception as e:
        return {"status": "error", "data": None, "message": str(e)}

network_tools = [
    Tool(
        name="fetch_url",
        priority=6,
        description="Fetch content from a URL via a GET request",
        match_rule=lambda q: bool(re.search(r'https?:\/\/[^\s]+', q)) or bool(re.search(r'\b(fetch|url|http|website|page)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'https?:\/\/[^\s]+', q) else 0.7,
        validation_rule=lambda res: res.get("status") == "success" and res.get("data") is not None and len(res.get("data")) > 0,
        schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The URL string to fetch data from"},
                "maxLength": {"type": "number", "description": "The maximum number of characters to return (default 10000)"}
            },
            "required": ["url"]
        },
        execute=lambda **kwargs: execute_fetch_url(
            url=kwargs.get("url"), 
            maxLength=kwargs.get("maxLength", 10000)
        )
    )
]
