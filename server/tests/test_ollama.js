import fetch from "node-fetch";

const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        model: "mistral:latest",
        messages: [{ role: "user", content: "What is in sample.txt?" }],
        tools: [{
            type: "function",
            function: {
                name: "read_file",
                description: "Read a file",
                parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
            }
        }],
        stream: false
    })
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
1