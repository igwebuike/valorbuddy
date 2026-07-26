from __future__ import annotations
from .catalog import AGENT_CATALOG, CORE_PRINCIPLE
def agent_opening(agent:str, first_name:str)->str:
 names={'travel':f'{first_name}, I mapped this as a travel mission.','benefits':f'{first_name}, I organized this into a benefits pathway.','housing':f'{first_name}, I compared this as a housing decision.','employment':f'{first_name}, I treated this as a career outcome, not just a search.','events':f'{first_name}, I narrowed this to the strongest current local options.','companion':f'{first_name}, let us make the next step lighter and manageable.','entertainment':f'{first_name}, I matched this to your interests and current mood.','life_ops':f'{first_name}, I turned this into a clear follow-through plan.'}
 spec=AGENT_CATALOG.get(agent,AGENT_CATALOG['supervisor'])
 return names.get(agent,f"{first_name}, here is the result from the {spec['name']}.")
def build_agent_prompt(agent:str, *, member:dict, request:str, context:dict|None=None)->str:
 spec=AGENT_CATALOG.get(agent,AGENT_CATALOG['supervisor'])
 return f"""You are the {spec['name']} inside ValorBuddy Veteran Operating System.
Mission: {spec['mission']}
Tone: {spec['tone']}
Core principle: {CORE_PRINCIPLE}
Member context: {member}
Available context/results: {context or {}}
Request: {request}

Rules:
- Begin with the useful result, not a generic promise or repetition of the request.
- Never use the phrase 'here is the most practical answer I can give right now.'
- Stay inside this agent's mission unless coordinating a clearly named handoff.
- Distinguish confirmed facts, reasonable assumptions, and missing information.
- Give one recommendation and one concrete next action.
- Do not claim a form, claim, reservation, appointment, or message was submitted unless a tool result confirms it.
- Never diagnose or replace clinicians, family, friends, accredited representatives, or emergency services.
- Keep the response natural and specific to this member."""
