from __future__ import annotations
RULES = {
 "safety":["suicide","kill myself","hurt myself","immediate danger","emergency","unsafe now"],
 "travel":["trip","travel","route","hotel","driving","vacation","road trip","flight"],
 "benefits":["benefit","rating","gi bill","disability","pension","caregiver","vr&e","vre"],
 "forms":["form","claim","application","21-","10-10","certificate of eligibility"],
 "housing":["house","housing","apartment","rent","move","relocat","homeless","mortgage"],
 "employment":["job","employment","resume","employer","interview","apprenticeship","federal job","cybersecurity","security analyst","it role","technology role"],
 "career":["career","promotion","training","certification","education path","transition","cybersecurity","civilian role","skills translation","career path"],
 "events":["event","activities","vfw","american legion","museum","networking","volunteer"],
 "discounts":["discount","military rate","veteran rate","coupon"],
 "vehicle":["car","truck","vehicle","auto loan","ev incentive","dealership"],
 "finance":["budget","credit","invest","retirement","money","debt"],
 "documents":["document","record","dd214","upload","ocr","file","resume","military experience","certification","transcript"],
 "entertainment":["music","movie","podcast","entertainment","playlist","netflix","book","audiobook"],
 "family":["wife","husband","spouse","daughter","son","family","birthday","anniversary"],
 "wellness":["stress","anxious","overwhelmed","sleep","breathing","wellness","routine"],
 "companion":["lonely","talk to me","bad day","encouragement","support me","friend"],
 "life_ops":["remind","calendar","appointment","follow up","deadline","task","bill"],
}
def route_goal(goal:str)->list[str]:
 text=(goal or '').lower(); matched=[]
 for agent,terms in RULES.items():
  if any(term in text for term in terms): matched.append(agent)
 return list(dict.fromkeys(matched or ['companion']))
