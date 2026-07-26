"""ValorBuddy Veteran Operating System agent runtime."""
from .catalog import AGENT_CATALOG, TOOL_CATALOG, CORE_PRINCIPLE
from .router import route_goal
from .planner import build_fallback_plan
from .prompts import build_agent_prompt, agent_opening
