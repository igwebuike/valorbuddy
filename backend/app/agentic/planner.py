from __future__ import annotations
from .router import route_goal
from .catalog import TOOL_CATALOG
AGENT_TOOL={'travel':'travel.search','benefits':'benefits.guide','forms':'va_forms.search','housing':'housing.search','employment':'employment.search','career':'career.generate','events':'resources.search','discounts':'discounts.search','vehicle':'vehicle.research','finance':'finance.educate','documents':'documents.review','entertainment':'entertainment.suggest','family':'family.plan','wellness':'wellness.support','companion':'companion.support','life_ops':'reminder.create','health':'resources.search'}
def build_fallback_plan(goal:str)->dict:
 agents=['supervisor']+route_goal(goal)
 steps=[{'agent':'supervisor','tool':'profile.read','title':'Load service, location, accessibility, and preference context','input':{}},{'agent':'supervisor','tool':'memory.read','title':'Review confirmed preferences and active commitments','input':{}}]
 for agent in agents[1:]:
  if agent=='safety':
   steps.append({'agent':'safety','tool':'companion.support','title':'Provide immediate safety-focused guidance and human support options','input':{'mode':'safety','query':goal}}); continue
  tool=AGENT_TOOL.get(agent,'companion.support')
  inp={'query':goal,'category':agent}
  if tool=='reminder.create': inp={'title':goal[:180],'when_text':'Confirm timing with member'}
  steps.append({'agent':agent,'tool':tool,'title':f"{agent.replace('_',' ').title()} agent: complete the assigned mission step",'input':inp})
 if len(agents)>2:
  steps.append({'agent':'supervisor','tool':'companion.support','title':'Synthesize verified specialist results into one coordinated action plan','input':{'mode':'synthesis','query':goal}})
 return {'title':goal[:70].rstrip(' .') or 'New mission','primary_agent':agents[1] if len(agents)>1 else 'supervisor','participating_agents':agents,'risk_level':'medium' if any(TOOL_CATALOG.get(s['tool'],{}).get('approval') for s in steps) else ('high' if 'safety' in agents else 'low'),'success_definition':'The member receives verified results, a clear recommendation, and an explicit next action.','steps':steps}
