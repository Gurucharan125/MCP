import os
import importlib
import glob
from dataclasses import dataclass
from typing import Callable, Dict, Any, Awaitable

@dataclass
class Tool:
    name: str
    priority: int
    description: str
    match_rule: Callable[[str], bool]
    confidence_score: Callable[[str], float]
    validation_rule: Callable[[Dict[str, Any]], bool]
    schema: Dict[str, Any]
    execute: Callable[..., Any] # Can be async

all_tools = []
_tools_loaded = False

def load_dynamic_tools():
    global _tools_loaded
    if _tools_loaded:
        return
        
    current_dir = os.path.dirname(__file__)
    
    for filename in os.listdir(current_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            module_name = filename[:-3]
            try:
                module = importlib.import_module(f".{module_name}", package="server.tools")
                
                # Find all variables that end with _tools (like time_tools, calculator_tools)
                for var_name in dir(module):
                    if var_name.endswith('_tools'):
                        tools_list = getattr(module, var_name)
                        if isinstance(tools_list, list):
                            all_tools.extend(tools_list)
            except Exception as e:
                print(f"[System] Failed to dynamically load tool module {module_name}: {e}")
                
    _tools_loaded = True
    print(f"[System] Dynamically loaded {len(all_tools)} tools.")

# We will call this from app.py or agent.py at startup
