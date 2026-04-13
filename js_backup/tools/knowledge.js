export const knowledgeTools = [
    {
        name: "faq",
        priority: 7,
        description: "Get answers to frequently asked questions. Use this FIRST for any 'what is X' question.",
        matchRule: (q) => /\b(what\s+is|who\s+is|explain|describe)\b/i.test(q),
        confidenceScore: (q) => /\b(what\s+is|outline|mcp|node-fetch|fs|createserver)\b/i.test(q) ? 0.9 : 0.6,
        validationRule: (res) => res.status === "success" && !res.data.includes("I don't know the answer"),
        schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "The question to ask" }
            },
            required: ["query"]
        },
        execute: async ({ query }) => {
            const faqs = {
                "what is OutLine": "Outline View: This view displays the symbol tree/file component structure of the currently active editor.It is enabled by default in the latest version of VS Code. You can open it by clicking on the Outline icon in the Activity Bar on the side of the editor.",
                "what is mcp": "MCP is a protocol that allows AI models to interact with external tools like files, APIs, and databases.",
                "what is node-fetch": "node-fetch is a library that allows you to make HTTP requests in Node.js.",
                "what is fs": "fs is a built-in Node.js module that provides functionality for working with the file system.",
                "what is createserver": "createServer is a function from the @modelcontextprotocol/sdk library that creates an MCP server.",
                "what is server.tool": "server.tool is a function from the @modelcontextprotocol/sdk library that registers a tool with the MCP server.",
                "what is server.serve": "server.serve is a function from the @modelcontextprotocol/sdk library that starts the MCP server."
            };
            const stopWords = new Set(["what", "is", "does", "the", "a", "an", "how", "why", "do", "can", "mean", "stand", "for", "about", "tell", "me", "explain", "describe"]);
            const q = query?.toLowerCase().replace(/[?!.,]/g, '').trim() || "";
            const qWords = q.split(/\s+/).filter(w => !stopWords.has(w));

            // Find the FAQ key whose subject words best overlap with the query
            let bestMatch = null;
            let bestScore = 0;
            for (const key of Object.keys(faqs)) {
                const keyWords = key.toLowerCase().split(/\s+/).filter(w => !stopWords.has(w));
                const overlap = keyWords.filter(kw => qWords.some(qw => qw.includes(kw) || kw.includes(qw))).length;
                if (overlap > bestScore) {
                    bestScore = overlap;
                    bestMatch = key;
                }
            }

            const answer = bestMatch && bestScore > 0 ? faqs[bestMatch] : "I'm sorry, I don't know the answer to that FAQ.";
            return { status: "success", data: answer, message: "FAQ result" };
        }
    }
];
