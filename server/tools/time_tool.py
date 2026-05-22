import datetime
import re
from . import Tool

time_tools = [
    Tool(
        name="current_date",
        priority=10,
        description="Get the current date",
        match_rule=lambda q: bool(re.search(r'\b(date|today)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'\b(today|date)\b', q, re.IGNORECASE) else 0.7,
        validation_rule=lambda res: res.get("status") == "success" and bool(res.get("data")),
        schema={"type": "object", "properties": {}},
        execute=lambda **kwargs: {
            "status": "success", 
            "data": datetime.date.today().strftime("%a %b %d %Y"), 
            "message": "Current date retrieved"
        }
    ),
    Tool(
        name="current_time",
        priority=10,
        description="Get the current time",
        match_rule=lambda q: bool(re.search(r'\b(time|now)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'\b(time|now)\b', q, re.IGNORECASE) else 0.7,
        validation_rule=lambda res: res.get("status") == "success" and bool(res.get("data")),
        schema={"type": "object", "properties": {}},
        execute=lambda **kwargs: {
            "status": "success", 
            "data": datetime.datetime.now().strftime("%I:%M:%S %p"), 
            "message": "Current time retrieved"
        }
    ),
    Tool(
        name="current_date_time",
        priority=10,
        description="Get the current date and time",
        match_rule=lambda q: bool(re.search(r'\b(date\s+and\s+time|time\s+and\s+date|history)\b', q, re.IGNORECASE)),
        confidence_score=lambda q: 1.0 if re.search(r'\b(date\s+and\s+time|time\s+and\s+date)\b', q, re.IGNORECASE) else 0.8,
        validation_rule=lambda res: res.get("status") == "success" and bool(res.get("data")),
        schema={"type": "object", "properties": {}},
        execute=lambda **kwargs: {
            "status": "success", 
            "data": str(datetime.datetime.now()), 
            "message": "Current date/time retrieved"
        }
    )
]
