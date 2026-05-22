import os
import re
from . import Tool
from .supabase_client import supabase

def execute_query_supabase(table: str, select: str = "*", limit: int = 10, filter_column: str = None, filter_value: str = None) -> dict:
    try:
        max_limit = min(limit, 100)
        
        query = supabase.table(table).select(select)
        
        if filter_column and filter_value:
            query = query.eq(filter_column, filter_value)
            
        result = query.limit(max_limit).execute()
        
        return {
            "status": "success", 
            "data": result.data, 
            "message": f"Queried {len(result.data)} rows from {table}"
        }
    except Exception as e:
        return {"status": "error", "data": None, "message": str(e)}

database_tools = [
    Tool(
        name="query_supabase",
        priority=8,
        description="Query rows from a Supabase database table. Returns a JSON string of results.",
        match_rule=lambda q: bool(re.search(r'\b(query|database|table|supabase)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 0.9 if re.search(r'\b(query|database|table|supabase)\b', q, re.IGNORECASE) else 0.6,
        validation_rule=lambda res: res.get("status") == "success" and isinstance(res.get("data"), list),
        schema={
            "type": "object",
            "properties": {
                "table": {"type": "string", "description": "The name of the database table to query"},
                "select": {"type": "string", "description": "The columns to select, comma separated. Use '*' for all."},
                "limit": {"type": "number", "description": "Maximum number of rows to return (default 10, max 100)"},
                "filter_column": {"type": "string", "description": "The column name to filter by (optional)"},
                "filter_value": {"type": "string", "description": "The value to match in the filter column (optional)"}
            },
            "required": ["table"]
        },
        execute=lambda **kwargs: execute_query_supabase(
            table=kwargs.get("table"),
            select=kwargs.get("select", "*"),
            limit=kwargs.get("limit", 10),
            filter_column=kwargs.get("filter_column"),
            filter_value=kwargs.get("filter_value")
        )
    )
]
