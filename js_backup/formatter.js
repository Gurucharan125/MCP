export function formatToolResult(query, toolResult) {
    // Fast template-based formatting — no LLM call needed
    if (toolResult.status === "error") {
        return `❌ Error: ${toolResult.message}`;
    }

    const { data, message } = toolResult;

    // Simple scalar results (time, date, calculator)
    if (data === null || data === undefined) {
        return message || "Done.";
    }
    if (typeof data === "string" || typeof data === "number") {
        return `${message}\n\n${data}`;
    }

    // Array of objects (database rows, search results)
    if (Array.isArray(data)) {
        if (data.length === 0) return `${message || "No results found."}`;

        // Format as a readable list
        const keys = Object.keys(data[0]);
        const rows = data.map((row, i) =>
            `${i + 1}. ${keys.map(k => `${k}: ${row[k]}`).join(" | ")}`
        ).join("\n");
        return `${message}\n\n${rows}`;
    }

    // Single object
    if (typeof data === "object") {
        const entries = Object.entries(data)
            .map(([k, v]) => `• ${k}: ${v}`)
            .join("\n");
        return `${message}\n\n${entries}`;
    }

    return message || JSON.stringify(data);
}
