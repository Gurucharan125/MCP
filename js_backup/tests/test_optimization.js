import { runAgent } from "../agent.js";

async function test() {
    const chatHistory = [];
    
    console.log("\n--- TEST: RAG OPTIMIZATION (Bioluminescence) ---");
    const query = "Provide a precise answer: example of organisms rely on bioluminescence";
    await runAgent(query, chatHistory);
    
    console.log("\n--- TEST: RAG OPTIMIZATION (Positive Thinking - HIGH confidence) ---");
    const query2 = "Tell me about the attitude of positive thinking and its benefits for the mind";
    await runAgent(query2, chatHistory);
    
    console.log("\n--- TEST: EARLY EXIT (No RAG/Phi) ---");
    await runAgent("25 + 67", chatHistory);
}

test().catch(console.error);
