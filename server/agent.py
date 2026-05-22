import time
from typing import List, Dict, Any, Tuple
from .tools import all_tools
from .config import CONFIG
from .router import get_intent
from .formatter import format_tool_result
from .llm import chat

def execute_tool(tool_name: str, args: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    tool_def = next((t for t in all_tools if t.name == tool_name), None)
    
    if not tool_def:
        return {"status": "error", "data": None, "message": f"Unknown tool: {tool_name}"}, False
        
    print(f"[Execution] Invoking tool: {tool_def.name}")
    print(f"[Execution] Args: {args}")
    
    try:
        result = tool_def.execute(**args)
        
        is_valid = tool_def.validation_rule(result)
        print(f"[Execution] Tool Result Validity: {'VALID' if is_valid else 'INVALID'}")
        
        return result, is_valid
    except Exception as e:
        print(f"[Execution] Error in {tool_def.name}: {str(e)}")
        return {"status": "error", "data": None, "message": str(e)}, False

def run_agent(query: str, chat_history: List[Dict[str, str]], is_interactive: bool = False):
    if not query or not query.strip():
        print("[Agent] Empty query received. Skipping.")
        return
        
    start_time = time.time()
    print("\n" + "=" * 50)
    print(f"[Agent] Processing Query: \"{query}\"")
    print("=" * 50)
    
    pre_rag_start = time.time()
    intent = get_intent(query)
    pre_rag_time = (time.time() - pre_rag_start) * 1000
    
    final_answer = ""
    
    if intent["path"] == "DIRECT_TOOL":
        result, is_valid = execute_tool(intent["tool"], intent.get("args", {}))
        if is_valid:
            final_answer = format_tool_result(query, result)
        else:
            intent["path"] = "RAG_FALLBACK"
            
    if intent["path"] in ["RAG_FALLBACK", "PHI:latest"]:
        print("\n[Decision Path] Entering RAG Fallback...")
        
        rag_tool = next((t for t in all_tools if t.name == "search_knowledge_rag"), None)
        
        emb_start = time.time()
        rag_res = rag_tool.execute(query=query) if rag_tool else {"confidence": "LOW", "data": ""}
        total_rag_time = (time.time() - emb_start) * 1000
        
        confidence = rag_res.get("confidence", "LOW")
        scores = rag_res.get("scores", {"max": 0, "avg": 0})
        
        print(f"Confidence Level: {confidence}")
        print(f"[RAG Metrics] Max: {scores.get('max', 0):.2f} | Avg: {scores.get('avg', 0):.2f}")
        
        gen_start = time.time()
        if confidence == "HIGH":
            print("[Decision Path] RAG Confidence HIGH -> Phi Grounded Mode")
            prompt = f"Answer in one short sentence (<15 words) using context: {rag_res.get('data')}\n\nQuestion: {query}"
            response = chat([{"role": "user", "content": prompt}], options={"num_predict": 30})
            final_answer = response.get("content", "")
        elif confidence == "MEDIUM":
            print("[Decision Path] RAG Confidence MEDIUM -> Phi Grounded Mode (Aggressive Limit)")
            prompt = f"Context: {rag_res.get('data')}\n\nQuestion: {query}\nInstruction: Return only examples or a direct answer. Max 10 words."
            response = chat([{"role": "user", "content": prompt}], options={"num_predict": 20})
            final_answer = response.get("content", "")
        else:
            print("[Decision Path] RAG Confidence LOW -> Phi General Mode")
            prompt = f"Answer in 2-3 detailed sentences (~50 words): {query}"
            response = chat([{"role": "user", "content": prompt}], options={"num_predict": 100})
            final_answer = response.get("content", "")
            
        gen_time = (time.time() - gen_start) * 1000
        
        if confidence != "LOW":
            parts = __import__('re').split(r'[.!?]', final_answer)
            final_answer = parts[0] + "." if parts else final_answer
        else:
            final_answer = final_answer.strip()
            
        print(f"\n[Telemetry] Pre-processing: {pre_rag_time:.1f}ms")
        print(f"[Telemetry] RAG (Emb+Search): {total_rag_time:.1f}ms")
        print(f"[Telemetry] Phi Generation: {gen_time:.1f}ms")
        print(f"[Telemetry] Total Latency: {(time.time() - start_time) * 1000:.1f}ms")
        
    print("\n" + "-" * 20 + " FINAL ANSWER " + "-" * 20)
    print(final_answer)
    print("-" * 50)
    
    chat_history.append({"role": "user", "content": query})
    chat_history.append({"role": "assistant", "content": final_answer})
