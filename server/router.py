import re
from typing import Dict, Any, List

def normalize_query(query: str) -> str:
    return query.lower().strip()

def extract_args(tool_name: str, query: str) -> Dict[str, Any]:
    q = normalize_query(query)
    
    if tool_name == "calculator":
        calc_match = re.search(r'([\d\s\+\-\*\/\!\^\(\)\.]+)', query)
        return {"expression": calc_match.group(1).strip() if calc_match else query}
        
    elif tool_name == "read_file":
        file_match = re.search(r'\b([^\s]+\.\w+)\b', query)
        return {"path": file_match.group(1) if file_match else ""}
        
    elif tool_name == "list_files":
        dir_match = re.search(r'(?:list|ls|dir)\s+(.+)', query, re.IGNORECASE)
        return {"path": dir_match.group(1).strip() if dir_match else "."}
        
    elif tool_name == "search_files":
        search_match = re.search(r'search\s+(.+?)\s+in\s+(.+)', query, re.IGNORECASE)
        if search_match:
            return {"query": search_match.group(1).strip(), "path": search_match.group(2).strip()}
        return {"query": query, "path": "."}
        
    elif tool_name == "query_supabase":
        db_match = re.search(r'(?:from|in)\s+(\w+)', query, re.IGNORECASE)
        return {"table": db_match.group(1) if db_match else "events"}
        
    elif tool_name == "fetch_url":
        url_match = re.search(r'https?:\/\/[^\s]+', query)
        return {"url": url_match.group(0) if url_match else ""}
        
    elif tool_name in ["faq", "summerize_text"]:
        return {"query": query, "text": query, "sentences": 3}
        
    return {}

def get_intent(query: str) -> Dict[str, Any]:
    from .tools import all_tools
    
    q = normalize_query(query)
    print(f"\n[Router] Evaluating all tools for: \"{q}\"")
    
    scores = []
    
    for tool in all_tools:
        if tool.name == "search_knowledge_rag":
            continue
            
        score = 0.0
        try:
            if tool.match_rule(q):
                score = tool.confidence_score(q)
        except Exception as e:
            print(f"[Router] Error scoring tool {tool.name}: {str(e)}")
            
        scores.append({
            "name": tool.name, 
            "score": score, 
            "priority": tool.priority,
            "tool": tool
        })
        
        if score > 0:
            print(f"  - Tool: {tool.name.ljust(20)} | Score: {score:.2f} | Priority: {tool.priority}")
            
    candidates = []
    for meta in scores:
        if meta["score"] >= 0.6:
            candidates.append({
                "tool": meta["tool"],
                "score": meta["score"],
                "priority": meta["priority"],
                "total_rank": meta["score"] + (meta["priority"] * 0.01)
            })
            
    if not candidates:
        print("[Router] No tool passed the 0.6 confidence threshold.")
        return {"path": "RAG_FALLBACK"}
        
    # Sort by rank (descending), then priority (descending)
    candidates.sort(key=lambda x: (x["total_rank"], x["priority"]), reverse=True)
    
    best = candidates[0]
    print(f"[Router] Selected: {best['tool'].name} (Rank: {best['total_rank']:.3f})")
    
    return {
        "path": "DIRECT_TOOL",
        "tool": best["tool"].name,
        "args": extract_args(best["tool"].name, query)
    }
