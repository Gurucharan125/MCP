import { allTools } from "./tools/index.js";
import { CONFIG } from "./config.js";
import { getIntent } from "./router.js";
import { formatToolResult } from "./formatter.js";
import { chat } from "./llm.js";

/* ---------------- TOOL EXECUTION ---------------- */

export async function executeTool(toolName, args) {
    const toolDefinition = allTools.find(t => t.name === toolName);

    if (!toolDefinition) {
        return { status: "error", data: null, message: `Unknown tool: ${toolName}` };
    }

    console.log(`[Execution] Invoking tool: ${toolDefinition.name}`);
    console.log(`[Execution] Args: ${JSON.stringify(args)}`);

    try {
        const result = await toolDefinition.execute(args);

        // --- 7. TOOL EXECUTION VALIDATION ---
        const isValid = toolDefinition.validationRule(result);
        console.log(`[Execution] Tool Result Validity: ${isValid ? "VALID" : "INVALID"}`);

        return { result, isValid };
    } catch (err) {
        console.error(`[Execution] Error in ${toolDefinition.name}:`, err.message);
        return { result: { status: "error", data: null, message: err.message }, isValid: false };
    }
}

/* ---------------- MAIN AGENT ---------------- */

export async function runAgent(query, chatHistory, isInteractive = false) {
    if (!query || !query.trim()) {
        console.log("[Agent] Empty query received. Skipping.");
        return;
    }
    const startTime = performance.now();
    console.log("\n" + "=".repeat(50));
    console.log(`[Agent] Processing Query: "${query}"`);
    console.log("=".repeat(50));

    // 1. Pre-processing Timer
    const preRAGStart = performance.now();
    const intent = await getIntent(query);
    const preRAGTime = (performance.now() - preRAGStart).toFixed(1);

    let finalAnswer = "";

    if (intent.path === "DIRECT_TOOL") {
        const { result, isValid } = await executeTool(intent.tool, intent.args || {});
        if (isValid) {
            finalAnswer = formatToolResult(query, result);
        } else {
            intent.path = "RAG_FALLBACK";
        }
    }

    if (intent.path === "RAG_FALLBACK" || intent.path === "PHI:latest") {
        console.log("\n[Decision Path] Entering RAG Fallback...");

        const ragTool = allTools.find(t => t.name === "search_knowledge_rag");

        // RAG Timing Breakdown
        const embStart = performance.now();
        const ragRes = await ragTool.execute({ query }); // Logic handles embedding + search
        const totalRAGTime = (performance.now() - embStart).toFixed(1);

        console.log(`Confidence Level: ${ragRes.confidence}`);
        console.log(`[RAG Metrics] Max: ${ragRes.scores?.max?.toFixed(2) || 0} | Avg: ${ragRes.scores?.avg?.toFixed(2) || 0}`);

        const genStart = performance.now();
        if (ragRes.confidence === "HIGH") {
            console.log("[Decision Path] RAG Confidence HIGH -> Phi Grounded Mode");
            const prompt = `Answer in one short sentence (<15 words) using context: ${ragRes.data}\n\nQuestion: ${query}`;
            const response = await chat([{ role: "user", content: prompt }], null, { num_predict: 30 });
            finalAnswer = response.content;
        } else if (ragRes.confidence === "MEDIUM") {
            console.log("[Decision Path] RAG Confidence MEDIUM -> Phi Grounded Mode (Aggressive Limit)");
            // MEDIUM RULE: limit to 1 chunk, enforce very short output
            const prompt = `Context: ${ragRes.data}\n\nQuestion: ${query}\nInstruction: Return only examples or a direct answer. Max 10 words.`;
            const response = await chat([{ role: "user", content: prompt }], null, { num_predict: 20 });
            finalAnswer = response.content;
        } else {
            console.log("[Decision Path] RAG Confidence LOW -> Phi General Mode");
            const prompt = `Answer in 2-3 detailed sentences (~50 words): ${query}`;
            const response = await chat([{ role: "user", content: prompt }], null, { num_predict: 100 });
            finalAnswer = response.content;
        }
        const genTime = (performance.now() - genStart).toFixed(1);

        // HARD OUTPUT TRIM (Allow more sentences in General Mode)
        if (ragRes.confidence !== "LOW") {
            finalAnswer = finalAnswer.split(/[.!?]/)[0] + ".";
        } else {
            // In general mode, just ensure it's not excessively long but allow multiple sentences
            finalAnswer = finalAnswer.trim();
        }

        // Performance Telemetry
        console.log(`\n[Telemetry] Pre-processing: ${preRAGTime}ms`);
        console.log(`[Telemetry] RAG (Emb+Search): ${totalRAGTime}ms`);
        console.log(`[Telemetry] Phi Generation: ${genTime}ms`);
        console.log(`[Telemetry] Total Latency: ${(performance.now() - startTime).toFixed(1)}ms`);
    }

    console.log("\n" + "-".repeat(20) + " FINAL ANSWER " + "-".repeat(20));
    console.log(finalAnswer);
    console.log("-".repeat(50));

    chatHistory.push({ role: "user", content: query });
    chatHistory.push({ role: "assistant", content: finalAnswer });
}