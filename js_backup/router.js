import { allTools } from "./tools/index.js";

/**
 * Normalizes the query for consistent matching.
 */
function normalizeQuery(query) {
    return query.toLowerCase().trim();
}

/**
 * Extracts arguments from a query for a given tool.
 * This is a helper that maps queries to tool-specific structures.
 */
function extractArgs(toolName, query) {
    const q = normalizeQuery(query);
    
    switch (toolName) {
        case "calculator":
            const calcMatch = query.match(/([\d\s\+\-\*\/\!\^\(\)\.]+)/);
            return { expression: calcMatch ? calcMatch[1].trim() : query };
            
        case "read_file":
            const fileMatch = query.match(/\b([^\s]+\.\w+)\b/);
            return { path: fileMatch ? fileMatch[1] : "" };
            
        case "list_files":
            const dirMatch = query.match(/(?:list|ls|dir)\s+(.+)/i);
            return { path: dirMatch ? dirMatch[1].trim() : "." };
            
        case "search_files":
            const searchMatch = query.match(/search\s+(.+?)\s+in\s+(.+)/i);
            if (searchMatch) return { query: searchMatch[1].trim(), path: searchMatch[2].trim() };
            return { query: query, path: "." };
            
        case "query_supabase":
            const dbMatch = query.match(/(?:from|in)\s+(\w+)/i);
            return { table: dbMatch ? dbMatch[1] : "events" }; 
            
        case "fetch_url":
            const urlMatch = query.match(/https?:\/\/[^\s]+/);
            return { url: urlMatch ? urlMatch[0] : "" };
            
        case "faq":
        case "summerize_text":
            return { query: query, text: query, sentences: 3 };
            
        default:
            return {};
    }
}

/**
 * Evaluates all tools and returns the best match according to the specification.
 */
export function getIntent(query) {
    const q = normalizeQuery(query);
    console.log(`\n[Router] Evaluating all tools for: "${q}"`);
    
    const scores = [];

    for (const tool of allTools) {
        // RAG is handled as a fallback in agent.js, skip it here
        if (tool.name === "search_knowledge_rag") continue;

        let score = 0;
        try {
            if (tool.matchRule(q)) {
                score = tool.confidenceScore(q);
            }
        } catch (e) {
            console.error(`[Router] Error scoring tool ${tool.name}:`, e.message);
        }

        scores.push({ name: tool.name, score, priority: tool.priority });
        
        if (score > 0) {
            console.log(`  - Tool: ${tool.name.padEnd(20)} | Score: ${score.toFixed(2)} | Priority: ${tool.priority}`);
        }
    }

    // Filter tools based on threshold (Discard scores < 0.6)
    const candidates = allTools.filter(t => {
        const meta = scores.find(m => m.name === t.name);
        return meta && meta.score >= 0.6;
    }).map(t => {
        const meta = scores.find(m => m.name === t.name);
        return {
            tool: t,
            score: meta.score,
            priority: meta.priority,
            totalRank: meta.score + (meta.priority * 0.01)
        };
    });

    if (candidates.length === 0) {
        console.log("[Router] No tool passed the 0.6 confidence threshold.");
        return { path: "RAG_FALLBACK" };
    }

    // Sort by rank (Score + PriorityWeight), then priority
    candidates.sort((a, b) => {
        if (b.totalRank !== a.totalRank) return b.totalRank - a.totalRank;
        return b.priority - a.priority;
    });

    const best = candidates[0];
    console.log(`[Router] Selected: ${best.tool.name} (Rank: ${best.totalRank.toFixed(3)})`);

    return {
        path: "DIRECT_TOOL",
        tool: best.tool.name,
        args: extractArgs(best.tool.name, query)
    };
}