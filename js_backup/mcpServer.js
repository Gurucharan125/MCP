import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { allTools } from "./tools/index.js";
import { z } from "zod";

const server = new McpServer({
    name: "mcp_practice_server",
    version: "1.0.0",
});

// A lightweight JSON Schema to Zod translator
function jsonSchemaToZod(schema) {
    const shape = {};
    if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
            let zType = z.string();
            if (prop.type === "number") zType = z.number();
            if (prop.type === "boolean") zType = z.boolean();
            if (prop.description) zType = zType.describe(prop.description);

            if (!schema.required || !schema.required.includes(key)) {
                zType = zType.optional();
            }
            shape[key] = zType;
        }
    }
    return shape;
}

// Register all modular tools
for (const tool of allTools) {
    const zodShape = jsonSchemaToZod(tool.schema);
    server.tool(tool.name, tool.description, zodShape, async (args) => {
        try {
            const result = await tool.execute(args);
            return { content: [{ type: "text", text: String(result) }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
    });
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
