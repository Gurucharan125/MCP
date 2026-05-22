import re
import math
from . import Tool

# Basic safe evaluation function
def safe_eval(expr: str):
    # Allow numbers, basic operators, and math functions
    allowed_names = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
    allowed_names['abs'] = abs
    allowed_names['round'] = round
    
    # Replace ! with factorial
    expr = re.sub(r'(\d+)!', r'factorial(\1)', expr)
    # Replace ^ with **
    expr = expr.replace('^', '**')
    
    code = compile(expr, "<string>", "eval")
    # Verify no malicious AST nodes exist here ideally, but using empty builtins limits damage
    for name in code.co_names:
        if name not in allowed_names:
            raise NameError(f"Use of {name} not allowed")
            
    return eval(code, {"__builtins__": {}}, allowed_names)

def execute_calculator(expression: str) -> dict:
    try:
        result = safe_eval(expression.lower())
        return {
            "status": "success", 
            "data": str(result), 
            "message": f"Calculated: {expression}"
        }
    except Exception as e:
        return {"status": "error", "data": None, "message": str(e)}

calculator_tools = [
    Tool(
        name="calculator",
        priority=10,
        description="Evaluate a mathematical expression safely. Supports advanced math like sin(), cos(), ! (factorial), and basic arithmetic.",
        match_rule=lambda q: bool(re.search(r'[\d\+\-\*\/\!\^\(\)\.\=]', q)) and bool(re.search(r'[0-9]', q)),
        confidence_score=lambda q: 1.0 if re.match(r'^[0-9\+\-\*\/\!\^\(\)\.\s]+$', q) else 0.8,
        validation_rule=lambda res: res.get("status") == "success" and res.get("data") is not None and not (res.get("data", "") == "nan"),
        schema={
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "The mathematical expression to evaluate"}
            },
            "required": ["expression"]
        },
        execute=lambda **kwargs: execute_calculator(expression=kwargs.get("expression", ""))
    )
]
