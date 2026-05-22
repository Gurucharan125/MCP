import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from . import Tool

def execute_summarize(text: str = None, path: str = None, sentences: int = 4) -> dict:
    content = text
    if path:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            return {"status": "error", "data": None, "message": f"Could not read file {path}: {str(e)}"}
            
    if not content or not content.strip():
        return {"status": "error", "data": None, "message": "No text provided to summarize."}
        
    # Simple sentence tokenizer
    sentence_tokens = [s.strip() for s in re.split(r'(?<=[.!?])\s+', content) if s.strip()]
    
    if len(sentence_tokens) <= sentences:
        return {"status": "success", "data": content, "message": "Text is already shorter than or equal to the desired summary length."}
        
    try:
        # Use TfidfVectorizer to get sentence scores based on full document vocabulary
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(sentence_tokens)
        
        # Calculate score for each sentence by summing its TF-IDF values
        sentence_scores = tfidf_matrix.sum(axis=1).A1
        
        # Pair sentences with their scores and original indices
        scored_sentences = [
            {"index": i, "score": score, "text": text} 
            for i, (score, text) in enumerate(zip(sentence_scores, sentence_tokens))
        ]
        
        # Sort by highest score
        scored_sentences.sort(key=lambda x: x["score"], reverse=True)
        
        # Take the top N sentences and sort them back into chronological order
        top_sentences = sorted(scored_sentences[:sentences], key=lambda x: x["index"])
        summary_text = " ".join([s["text"] for s in top_sentences])
        
        return {
            "status": "success", 
            "data": summary_text, 
            "message": f"Summarized an original text of {len(sentence_tokens)} sentences down to {sentences}."
        }
    except Exception as e:
        return {"status": "error", "data": None, "message": f"Summarization failed: {str(e)}"}

summarize_tools = [
    Tool(
        name="summerize_text",
        priority=7,
        description="Summarizes text or a file using TF-IDF natural language processing. Provide raw text or a file path.",
        match_rule=lambda q: bool(re.search(r'\b(summarize|summarise|summary|gist|shorten)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'\b(summarize|summary)\b', q, re.IGNORECASE) else 0.7,
        validation_rule=lambda res: res.get("status") == "success" and res.get("data") is not None and len(res.get("data")) > 0,
        schema={
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Raw text to summarize"},
                "path": {"type": "string", "description": "Path to the file to summarize"},
                "sentences": {"type": "number", "description": "Number of sentences to include in the summary (default 4)"}
            }
        },
        execute=lambda **kwargs: execute_summarize(
            text=kwargs.get("text"),
            path=kwargs.get("path"),
            sentences=kwargs.get("sentences", 4)
        )
    )
]
