import asyncio
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
import mcp.types as types

from .tools import all_tools, load_dynamic_tools

server = Server("mcp_practice_server")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    tools = []
    for tool_def in all_tools:
        # Convert simple dict schema to what MCP expects
        # (Assuming the schema is already a standard JSON Schema)
        tools.append(
            types.Tool(
                name=tool_def.name,
                description=tool_def.description,
                inputSchema=tool_def.schema
            )
        )
    return tools

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    tool_def = next((t for t in all_tools if t.name == name), None)
    if not tool_def:
        raise ValueError(f"Tool {name} not found")
        
    try:
        # Execute tool synchronously (our tools are synchronous in this implementation)
        result = tool_def.execute(**arguments)
        return [types.TextContent(type="text", text=str(result))]
    except Exception as e:
        return [types.TextContent(type="text", text=f"Error: {str(e)}")]

async def main():
    load_dynamic_tools()
    
    # Run server on stdio
    async with stdio_server() as (read_stream, write_stream):
        print("MCP Server running on stdio", file=sys.stderr)
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Fatal error in main(): {e}", file=sys.stderr)
        sys.exit(1)
