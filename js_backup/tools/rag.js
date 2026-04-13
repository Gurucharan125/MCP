import crypto from "node:crypto";
/**
 * Compute a hash for content (for deduplication).
 */
function computeContentHash(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Crawl a domain with deduplication and update control.
 * @param {string} domain
 * @param {Array<{url: string, content: string}>} pages
 * @param {string} mode - "normal" or "update"
 * @param {number|null} autoRefreshDays - If set, allows auto-refresh if lastCrawled > X days
 * @returns {Promise<{status: string, message: string, updated: number, skipped: number}>}
 *
 * Usage:
 *   crawlDomain("example.com", pages, "normal", 7) // auto-refresh if >7 days
 */
export async function crawlDomain(domain, pages, mode = "normal", autoRefreshDays = null) {
    // 1. Check deduplication policy
    const check = await checkDomainBeforeCrawl(domain, mode, autoRefreshDays);
    if (!check.allowed) {
        return { status: "blocked", message: check.message, updated: 0, skipped: 0 };
    }

    await loadIndex();
    let updated = 0, skipped = 0;

    for (const { url, content } of pages) {
        const hash = computeContentHash(content);
        const idx = documentChunks.findIndex(c => c.url === url);
        if (idx !== -1) {
            // Page exists, check hash
            if (documentChunks[idx].hash === hash) {
                skipped++;
                continue; // No change
            }
            // Update changed page (deduplication)
            documentChunks[idx].text = content;
            documentChunks[idx].hash = hash;
            try {
                documentChunks[idx].embedding = await getEmbedding(content);
            } catch (e) {
                // keep old embedding if failed
            }
            updated++;
        } else {
            // New page, prevent duplicate storage
            let embedding = null;
            try {
                embedding = await getEmbedding(content);
            } catch (e) {}
            documentChunks.push({
                domain,
                url,
                text: content,
                hash,
                embedding
            });
            updated++;
        }
    }
    await saveIndex();
    await updateDomainMeta(domain, pages.length);
    return {
        status: "success",
        message: `Crawl complete. Updated: ${updated}, Skipped: ${skipped}`,
        updated,
        skipped
    };
}
/**
 * Checks if a domain can be crawled, or should be blocked due to deduplication policy.
 * Returns { allowed: boolean, message: string }
 */
export async function checkDomainBeforeCrawl(domain, mode = "normal", autoRefreshDays = null) {
    const meta = await getDomainMeta(domain);
    if (!meta) {
        return { allowed: true, message: "Domain not indexed. Proceeding with crawl." };
    }
    if (mode === "update") {
        return { allowed: true, message: "Update mode: re-crawling domain." };
    }
    if (autoRefreshDays && meta.lastCrawled < Date.now() - autoRefreshDays * 24 * 60 * 60 * 1000) {
        return { allowed: true, message: `Auto-refresh: last crawled over ${autoRefreshDays} days ago.` };
    }
    return { allowed: false, message: "Domain already indexed. Use update mode to refresh." };
}
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "url";
import { getEmbedding, cosineSimilarity, normalizeQuery } from "../llm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const VECTOR_DB_PATH = path.join(__dirname, "vector_db.json");
const DOMAINS_DB_PATH = path.join(__dirname, "domains.json");
const documentChunks = []; // In-memory cache

// --- Domain metadata utilities ---
async function loadDomainsMeta() {
    try {
        const data = await fs.readFile(DOMAINS_DB_PATH, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

async function saveDomainsMeta(domains) {
    try {
        await fs.writeFile(DOMAINS_DB_PATH, JSON.stringify(domains, null, 2));
    } catch (e) {
        console.error(`[RAG] Failed to save domains metadata:`, e.message);
    }
}

async function getDomainMeta(domain) {
    const domains = await loadDomainsMeta();
    return domains.find(d => d.domain === domain);
}

async function updateDomainMeta(domain, urlCount) {
    const domains = await loadDomainsMeta();
    const idx = domains.findIndex(d => d.domain === domain);
    const now = Date.now();
    if (idx === -1) {
        domains.push({ domain, lastCrawled: now, urlCount });
    } else {
        domains[idx].lastCrawled = now;
        domains[idx].urlCount = urlCount;
    }
    await saveDomainsMeta(domains);
}

let isLoaded = false;

/**
 * Loads the vector database from disk.
 * Singleton: Only runs once per process.
 */
export async function loadIndex() {
    if (isLoaded) return true;
    try {
        const data = await fs.readFile(VECTOR_DB_PATH, "utf-8");
        const parsed = JSON.parse(data);
        documentChunks.length = 0;
        documentChunks.push(...parsed);
        console.log("Index loaded");
        isLoaded = true;
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Saves the vector database to disk.
 */
async function saveIndex() {
    try {
        await fs.writeFile(VECTOR_DB_PATH, JSON.stringify(documentChunks, null, 2));
    } catch (e) {
        console.error(`[RAG] Failed to save vector database:`, e.message);
    }
}

/**
 * Creates sliding window chunks with overlap.
 * size: target number of words per chunk
 * overlap: number of words to overlap with previous chunk
 */
function createOverlappingChunks(text, size = 300, overlap = 50) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chunks = [];
    
    if (words.length <= size) {
        return [words.join(" ")];
    }

    for (let i = 0; i < words.length; i += (size - overlap)) {
        const chunkWords = words.slice(i, i + size);
        if (chunkWords.length > 10) { // Avoid trivial chunks
            chunks.push(chunkWords.join(" "));
        }
        if (i + size >= words.length) break;
    }
    return chunks;
}

/**
 * Indexes all .txt files in the folder and saves to disk.
 */
export async function indexData(directory = ".") {
    const rootDir = path.resolve(__dirname, "../../");
    console.log(`[RAG Indexer] Starting sync in ${rootDir}...`);
    
    await loadIndex();

    try {
        const files = await fs.readdir(rootDir);
        const txtFiles = files.filter(f => f.endsWith(".txt") && f !== "requirements.txt");

        let indexChanged = false;

        for (const file of txtFiles) {
            const filePath = path.join(rootDir, file);
            const stats = await fs.stat(filePath);
            const mtime = stats.mtimeMs;

            const existingFileChunks = documentChunks.filter(c => c.source === file);
            if (existingFileChunks.length > 0 && existingFileChunks[0].mtime === mtime) {
                continue;
            }

            console.log(`[RAG Indexer] Processing ${file}...`);
            indexChanged = true;

            while (true) {
                const idx = documentChunks.findIndex(c => c.source === file);
                if (idx === -1) break;
                documentChunks.splice(idx, 1);
            }

            const content = await fs.readFile(filePath, "utf-8");
            const chunks = createOverlappingChunks(content, 300, 50);

            for (const chunkText of chunks) {
                try {
                    const emb = await getEmbedding(chunkText);
                    if (emb) {
                        documentChunks.push({
                            source: file,
                            text: chunkText,
                            embedding: emb,
                            mtime: mtime
                        });
                    }
                } catch (e) {
                    console.error(`[RAG Indexer] Error embedding ${file}:`, e.message);
                }
            }
        }

        if (indexChanged) await saveIndex();
    } catch (e) {
        console.error(`[RAG Indexer] Fatal error:`, e.message);
    }
}

/**
 * Calculates word-based overlap between two strings (0 to 1).
 */
function getWordOverlap(text1, text2) {
    const w1 = new Set(text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
    const w2 = new Set(text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
    if (w1.size === 0 || w2.size === 0) return 0;
    const intersection = new Set([...w1].filter(x => w2.has(x)));
    return intersection.size / Math.max(w1.size, w2.size);
}

/**
 * Trims a chunk to only include sentences containing query keywords.
 */
function trimChunkContent(text, normalizedQuery) {
    const keywords = normalizedQuery.split(/\s+/).filter(k => k.length > 2);
    if (keywords.length === 0) return text;

    const sentences = text.split(/(?<=[.!?])\s+/);
    const relevantSentences = sentences.filter(s => {
        const lowerS = s.toLowerCase();
        return keywords.some(k => lowerS.includes(k));
    });

    return relevantSentences.length > 0 ? relevantSentences.join(" ").trim() : text;
}

export const ragTools = [
    {
        name: "search_knowledge_rag",
        description: "Search local documents using the persistent index. STRICTLY uses memory cache.",
        schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" }
            },
            required: ["query"]
        },
        execute: async ({ query }) => {
            if (!query) return { status: "error", message: "Query is empty" };

            let embeddingCount = 0;
            const normalizedQ = normalizeQuery(query);

            if (documentChunks.length === 0) {
                await loadIndex();
            }

            if (documentChunks.length === 0) {
                return { status: "success", data: "Knowledge base is empty." };
            }

            console.log("Embedding query");
            embeddingCount++;

            let queryEmb;
            try {
                queryEmb = await getEmbedding(normalizedQ);
            } catch (e) {
                return { status: "error", message: `Embedding failed: ${e.message}` };
            }

            if (embeddingCount > 1) {
                console.error("INVALID: Document embedding detected during query");
            }

            console.log("Searching index");
            const scoredChunks = documentChunks.map(chunk => ({
                score: cosineSimilarity(queryEmb, chunk.embedding),
                chunk
            }));

            scoredChunks.sort((a, b) => b.score - a.score);
            const top5 = scoredChunks.slice(0, 5);
            
            // Calculate Scores
            const maxScore = top5.length > 0 ? top5[0].score : 0;
            const avgScore = top5.length > 0 ? top5.reduce((acc, curr) => acc + curr.score, 0) / top5.length : 0;

            // 1. DEFINE CONFIDENCE LEVELS (STRICT)
            let confidence = "LOW";
            if (maxScore >= 0.75 && avgScore >= 0.65) {
                confidence = "HIGH";
            } else if (maxScore >= 0.65 && avgScore >= 0.50) {
                confidence = "MEDIUM";
            }

            // AGGRESSIVE OPTIMIZATION: Use ONLY 1 chunk
            const topHit = scoredChunks[0];
            if (!topHit || confidence === "LOW") {
                return { 
                    status: "success", 
                    data: "No highly relevant information found.", 
                    confidence: "LOW", 
                    scores: { max: maxScore, avg: avgScore } 
                };
            }

            // Trim chunk to ≤200 characters
            const rawText = trimChunkContent(topHit.chunk.text, normalizedQ);
            const contextText = rawText.length > 200 ? rawText.substring(0, 200) + "..." : rawText;
            const answer = `[${topHit.chunk.source}] ${contextText}`;

            return {
                status: "success",
                data: answer,
                confidence: confidence,
                scores: { max: maxScore, avg: avgScore },
                metrics: { chunksSent: 1, totalChars: answer.length }
            };
        }
    },
    {
        name: "reindex_knowledge",
        priority: 5,
        matchRule: (q) => q.toLowerCase().includes("reindex") || q.toLowerCase().includes("sync knowledge"),
        confidenceScore: 0.9,
        description: "Manually re-index local files.",
        schema: { type: "object", properties: {} },
        execute: async () => {
             // Force re-load for indexing
            isLoaded = false;
            await indexData();
            return { status: "success", message: `Index updated. Total chunks: ${documentChunks.length}` };
        },
        validationRule: (res) => res.status === "success"
    }
];
