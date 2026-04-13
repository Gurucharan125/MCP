import { ragTools } from "../tools/rag.js";

async function run() {
    console.log("Testing RAG JS...");
    try {
        const rag = ragTools[0];
        const res = await rag.execute({ query: "technology has become an integral part of modern life" });
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

run();
