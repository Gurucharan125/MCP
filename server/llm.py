import requests
import json
import math
import re
from typing import List, Dict, Any, Optional
from .config import CONFIG

def ollama_request(endpoint: str, body: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{CONFIG.OLLAMA_BASE_URL}/{endpoint}"
    try:
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(body)
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        error_text = response.text if response else str(e)
        print(f"Ollama API error ({endpoint}): {error_text}")
        raise Exception(f"Ollama error: {error_text}")

def chat(messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]] = None, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if options is None:
        options = {}
    
    payload = {
        "model": CONFIG.CHAT_MODEL,
        "messages": messages,
        "stream": False,
        "options": options
    }
    
    if tools and len(tools) > 0 and "phi:latest" not in CONFIG.CHAT_MODEL:
        payload["tools"] = tools
        
    data = ollama_request("chat", payload)
    return data.get("message", {})

def get_embedding(text: str) -> List[float]:
    data = ollama_request("embeddings", {
        "model": CONFIG.EMBED_MODEL,
        "prompt": text
    })
    return data.get("embedding", [])

def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = 0.0
    mag_a = 0.0
    mag_b = 0.0
    
    for i in range(len(a)):
        dot += a[i] * b[i]
        mag_a += a[i] * a[i]
        mag_b += b[i] * b[i]
        
    if mag_a == 0 or mag_b == 0:
        return 0.0
        
    return dot / (math.sqrt(mag_a) * math.sqrt(mag_b))

def normalize_query(query: str) -> str:
    stopwords = {"what", "is", "the", "of", "about", "how", "why", "do", "you", "know", "tell", "me", "provide", "show", "get", "fetch", "list", "and", "a", "an", "for", "with", "in", "on", "at", "to"}
    
    # Remove punctuation
    query = re.sub(r'[?!.,]', '', query.lower())
    
    # Split, filter stopwords, and join
    words = query.split()
    filtered_words = [word for word in words if word not in stopwords]
    
    return " ".join(filtered_words).strip()
