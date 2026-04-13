import { allTools } from "../tools/index.js";

async function runTest() {
    const ragTool = allTools.find(t => t.name === "search_knowledge_rag");

    console.log("\n--- STARTUP LOG CHECK ---");
    // Should have logged "Index loaded" by now (check console output)

    console.log("\n--- QUERY LOG CHECK (Physical order) ---");
    const res = await ragTool.execute({ query: "What is positive thinking?" });
    
    console.log("\n--- RESULT STATUS ---");
    console.log("Status:", res.status);
    console.log("Confidence:", res.confidence);
}

runTest().catch(console.error);
