import fs from "node:fs/promises";

export const fileSystemTools = [
    {
        name: "read_file",
        priority: 9,
        description: "Read a file from the local file system",
        matchRule: (q) => /\b(read|open|show|display|cat)\b.*?\b[^\s]+\.\w+\b/i.test(q),
        confidenceScore: (q) => /\b(read|open|cat)\b.*?\b[^\s]+\.\w+\b/i.test(q) ? 1.0 : 0.7,
        validationRule: (res) => res.status === "success" && res.data !== null && res.data.length > 0,
        schema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The path to the file to read" }
            },
            required: ["path"]
        },
        execute: async ({ path }) => {
            try {
                const data = await fs.readFile(path, "utf-8");
                return { status: "success", data, message: `Read file: ${path}` };
            } catch (err) {
                return { status: "error", data: null, message: err.message };
            }
        }
    },
    {
        name: "list_files",
        priority: 8,
        description: "List files in a directory",
        matchRule: (q) => /\b(list|ls|dir)\b/i.test(q),
        confidenceScore: (q) => /\b(list|ls|dir)\b/i.test(q) ? 0.9 : 0.6,
        validationRule: (res) => res.status === "success" && Array.isArray(res.data),
        schema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The path to the directory" }
            },
            required: ["path"]
        },
        execute: async ({ path }) => {
            try {
                const files = await fs.readdir(path || ".");
                return { status: "success", data: files, message: `Listed directory: ${path}` };
            } catch (err) {
                return { status: "error", data: null, message: err.message };
            }
        }
    },
    {
        name: "search_files",
        priority: 8,
        description: "Search for files in a directory that match a query",
        matchRule: (q) => /\bsearch\b.*?\bin\b/i.test(q),
        confidenceScore: (q) => /\bsearch\b.*?\bin\b/i.test(q) ? 1.0 : 0.7,
        validationRule: (res) => res.status === "success" && Array.isArray(res.data),
        schema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The path to the directory" },
                query: { type: "string", description: "The search query substring" }
            },
            required: ["path", "query"]
        },
        execute: async ({ path, query }) => {
            try {
                const files = await fs.readdir(path || ".");
                const filteredFiles = files.filter(file => file.includes(query));
                return { status: "success", data: filteredFiles, message: `Searched for "${query}" in ${path}` };
            } catch (err) {
                return { status: "error", data: null, message: err.message };
            }
        }
    }
];

