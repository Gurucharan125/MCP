import fetch from "node-fetch";

const OLLAMA_URL = "http://localhost:11434/api/generate";

async function testIntent(prompt) {
    const systemPrompt = `
    You are an intent classifier. Categorize the user input into ONE of these:
    - TOOL: If the user wants a calculation, file read, or specific data.
    - CHAT: If the user wants to talk or needs complex reasoning.
    - FALLBACK: If the input is ambiguous.
    
    Output ONLY the category name.
    `;

    const res = await fetch(OLLAMA_URL, {
        method: "POST",
        body: JSON.stringify({
            model: "mistral:latest",
            prompt: `System: ${systemPrompt}\nUser: ${prompt}\nCategory:`,
            stream: false
        })
    });
    const data = await res.json();
    console.log(`Prompt: "${prompt}" -> Intent: ${data.response.trim()}`);
}

async function runTests() {
    await testIntent("What is 5 + 5?");
    await testIntent("Read sample.txt");
    await testIntent("How are you today?");
    await testIntent("Tell me a story about a dragon.");
}

runTests();
