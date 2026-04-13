import fetch from "node-fetch";

export const networkTools = [
    {
        name: "fetch_url",
        priority: 6,
        description: "Fetch content from a URL via a GET request",
        matchRule: (q) => /https?:\/\/[^\s]+/.test(q) || /\b(fetch|url|http|website|page)\b/i.test(q),
        confidenceScore: (q) => /https?:\/\/[^\s]+/.test(q) ? 1.0 : 0.7,
        validationRule: (res) => res.status === "success" && res.data !== null && res.data.length > 0,
        schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL string to fetch data from" },
                maxLength: { type: "number", description: "The maximum number of characters to return (default 10000)" }
            },
            required: ["url"]
        },
        execute: async ({ url, maxLength = 10000 }) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    return { status: "error", data: null, message: `Status ${response.status}: ${response.statusText}` };
                }
                const contentType = response.headers.get("content-type") || "";
                let result = "";

                if (contentType.includes("application/json")) {
                    const data = await response.json();
                    result = JSON.stringify(data);
                } else {
                    let text = await response.text();
                    if (contentType.includes("text/html")) {
                        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                   .replace(/<[^>]*>?/gm, '')
                                   .replace(/\s+/g, ' ')
                                   .trim();
                    }
                    result = text;
                }
                return { status: "success", data: result.substring(0, maxLength), message: `Fetched content from ${url}` };
            } catch (err) {
                return { status: "error", data: null, message: err.message };
            }
        }

    }
];
