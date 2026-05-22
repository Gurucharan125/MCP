import json
import os
import hashlib
from typing import List, Dict, Any
from ..llm import get_embedding, cosine_similarity, normalize_query
from . import Tool

_dir = os.path.dirname(os.path.abspath(__file__))
VECTOR_DB_PATH = os.path.join(_dir, "vector_db.json")
DOMAINS_DB_PATH = os.path.join(_dir, "domains.json")
document_chunks = []
_is_loaded = False

def compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def load_domains_meta() -> List[Dict[str, Any]]:
    try:
        if os.path.exists(DOMAINS_DB_PATH):
            with open(DOMAINS_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []

def save_domains_meta(domains: List[Dict[str, Any]]):
    try:
        with open(DOMAINS_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(domains, f, indent=2)
    except Exception as e:
        print(f"[RAG] Failed to save domains metadata: {e}")

def get_domain_meta(domain: str) -> Dict[str, Any]:
    domains = load_domains_meta()
    for d in domains:
        if d.get("domain") == domain:
            return d
    return None

import time

def update_domain_meta(domain: str, url_count: int):
    domains = load_domains_meta()
    idx = next((i for i, d in enumerate(domains) if d.get("domain") == domain), -1)
    now = int(time.time() * 1000)
    if idx == -1:
        domains.append({"domain": domain, "lastCrawled": now, "urlCount": url_count})
    else:
        domains[idx]["lastCrawled"] = now
        domains[idx]["urlCount"] = url_count
    save_domains_meta(domains)

def check_domain_before_crawl(domain: str, mode: str = "normal", auto_refresh_days: int = None) -> Dict[str, Any]:
    meta = get_domain_meta(domain)
    if not meta:
        return {"allowed": True, "message": "Domain not indexed. Proceeding with crawl."}
    if mode == "update":
        return {"allowed": True, "message": "Update mode: re-crawling domain."}
    if auto_refresh_days and meta.get("lastCrawled", 0) < int(time.time() * 1000) - auto_refresh_days * 24 * 60 * 60 * 1000:
        return {"allowed": True, "message": f"Auto-refresh: last crawled over {auto_refresh_days} days ago."}
    return {"allowed": False, "message": "Domain already indexed. Use update mode to refresh."}

def load_index():
    global _is_loaded
    if _is_loaded:
        return True
    try:
        if os.path.exists(VECTOR_DB_PATH):
            with open(VECTOR_DB_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                document_chunks.clear()
                document_chunks.extend(data)
            print("Index loaded")
        _is_loaded = True
        return True
    except Exception as e:
        print(f"[RAG] Failed to load index: {e}")
        return False

def save_index():
    try:
        with open(VECTOR_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(document_chunks, f, indent=2)
    except Exception as e:
        print(f"[RAG] Failed to save vector database: {e}")

def create_overlapping_chunks(text: str, size: int = 300, overlap: int = 50) -> List[str]:
    words = [w for w in text.split() if w]
    chunks = []
    if len(words) <= size:
        return [" ".join(words)]
    i = 0
    while i < len(words):
        chunk_words = words[i:i + size]
        if len(chunk_words) > 10:
            chunks.append(" ".join(chunk_words))
        if i + size >= len(words):
            break
        i += (size - overlap)
    return chunks

def index_data(directory: str = "."):
    root_dir = os.path.abspath(os.path.join(_dir, "../../"))
    print(f"[RAG Indexer] Starting sync in {root_dir}...")
    load_index()
    try:
        files = [f for f in os.listdir(root_dir) if f.endswith(".txt") and f != "requirements.txt"]
        index_changed = False
        
        for file in files:
            file_path = os.path.join(root_dir, file)
            mtime = os.path.getmtime(file_path) * 1000
            
            existing = [c for c in document_chunks if c.get("source") == file]
            if existing and existing[0].get("mtime") == mtime:
                continue
                
            print(f"[RAG Indexer] Processing {file}...")
            index_changed = True
            
            # Remove old chunks for this file
            document_chunks[:] = [c for c in document_chunks if c.get("source") != file]
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            chunks = create_overlapping_chunks(content, 300, 50)
            for chunk_text in chunks:
                try:
                    emb = get_embedding(chunk_text)
                    if emb:
                        document_chunks.append({
                            "source": file,
                            "text": chunk_text,
                            "embedding": emb,
                            "mtime": mtime
                        })
                except Exception as e:
                    print(f"[RAG Indexer] Error embedding {file}: {e}")
                    
        if index_changed:
            save_index()
    except Exception as e:
        print(f"[RAG Indexer] Fatal error: {e}")

def trim_chunk_content(text: str, normalized_query: str) -> str:
    keywords = [k for k in normalized_query.split() if len(k) > 2]
    if not keywords:
        return text
        
    sentences = [s.strip() for s in __import__('re').split(r'(?<=[.!?])\s+', text) if s.strip()]
    relevant = [s for s in sentences if any(k in s.lower() for k in keywords)]
    
    return " ".join(relevant) if relevant else text

def execute_rag(query: str) -> dict:
    if not query:
        return {"status": "error", "message": "Query is empty"}
        
    normalized_q = normalize_query(query)
    load_index()
    
    if not document_chunks:
        return {"status": "success", "data": "Knowledge base is empty."}
        
    try:
        query_emb = get_embedding(normalized_q)
    except Exception as e:
        return {"status": "error", "message": f"Embedding failed: {e}"}
        
    scored_chunks = []
    for chunk in document_chunks:
        if "embedding" in chunk and chunk["embedding"]:
            score = cosine_similarity(query_emb, chunk["embedding"])
            scored_chunks.append({"score": score, "chunk": chunk})
            
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    top5 = scored_chunks[:5]
    
    max_score = top5[0]["score"] if top5 else 0
    avg_score = sum(c["score"] for c in top5) / len(top5) if top5 else 0
    
    confidence = "LOW"
    if max_score >= 0.75 and avg_score >= 0.65:
        confidence = "HIGH"
    elif max_score >= 0.65 and avg_score >= 0.50:
        confidence = "MEDIUM"
        
    top_hit = scored_chunks[0] if scored_chunks else None
    if not top_hit or confidence == "LOW":
        return {
            "status": "success",
            "data": "No highly relevant information found.",
            "confidence": "LOW",
            "scores": {"max": max_score, "avg": avg_score}
        }
        
    raw_text = trim_chunk_content(top_hit["chunk"]["text"], normalized_q)
    context_text = raw_text[:200] + "..." if len(raw_text) > 200 else raw_text
    source = top_hit["chunk"].get("source", top_hit["chunk"].get("url", "unknown"))
    answer = f"[{source}] {context_text}"
    
    return {
        "status": "success",
        "data": answer,
        "confidence": confidence,
        "scores": {"max": max_score, "avg": avg_score},
        "metrics": {"chunksSent": 1, "totalChars": len(answer)}
    }

rag_tools = [
    Tool(
        name="search_knowledge_rag",
        priority=0, # Priority not strictly used as it's a fallback
        description="Search local documents using the persistent index. STRICTLY uses memory cache.",
        match_rule=lambda q: False, # explicitly ignored by router directly
        confidence_score=lambda q: 0,
        validation_rule=lambda res: res.get("status") == "success",
        schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"}
            },
            "required": ["query"]
        },
        execute=lambda **kwargs: execute_rag(query=kwargs.get("query"))
    ),
    Tool(
        name="reindex_knowledge",
        priority=5,
        description="Manually re-index local files.",
        match_rule=lambda q: "reindex" in q.lower() or "sync knowledge" in q.lower(),
        confidence_score=lambda q: 0.9,
        validation_rule=lambda res: res.get("status") == "success",
        schema={"type": "object", "properties": {}},
        execute=lambda **kwargs: execute_reindex()
    )
]

def execute_reindex() -> dict:
    global _is_loaded
    _is_loaded = False
    index_data()
    return {"status": "success", "message": f"Index updated. Total chunks: {len(document_chunks)}"}
