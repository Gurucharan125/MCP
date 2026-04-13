import fetch from "node-fetch";
import { CONFIG } from "./config.js";

export async function ollamaRequest(endpoint, body) {
    try {
        const res = await fetch(`${CONFIG.OLLAMA_BASE_URL}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Ollama error (${res.status}): ${errorText}`);
        }

        return await res.json();
    } catch (error) {
        console.error(`Ollama API error (${endpoint}):`, error.message);
        throw error;
    }
}

export async function chat(messages, tools = null, options = {}) {
    const payload = {
        model: CONFIG.CHAT_MODEL,
        messages,
        stream: false,
        options // Pass options like num_predict (max_tokens)
    };
    if (tools && tools.length > 0 && !CONFIG.CHAT_MODEL.includes("phi:latest")) {
        payload.tools = tools;
    }
    const data = await ollamaRequest("chat", payload);
    return data.message;
}

export async function getEmbedding(text) {
    const data = await ollamaRequest("embeddings", {
        model: CONFIG.EMBED_MODEL,
        prompt: text
    });
    return data.embedding;
}

export function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    return dot / (magA * magB);
}

/**
 * Strips common stopwords from a query to improve semantic search and reduce tokens.
 */
export function normalizeQuery(query) {
    const stopwords = new Set(["what", "is", "the", "of", "about", "how", "why", "do", "you", "know", "tell", "me", "provide", "show", "get", "fetch", "list", "and", "a", "an", "for", "with", "in", "on", "at", "to"]);
    return query
        .toLowerCase()
        .replace(/[?!.,]/g, '')
        .split(/\s+/)
        .filter(word => !stopwords.has(word))
        .join(" ")
        .trim();
}
