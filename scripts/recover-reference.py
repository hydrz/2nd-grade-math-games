"""Recover rigid placements from the user's raster; final data is independently verified.

The scan is evidence only, not an application dependency. Canonical dimensions are
in circle-diameter units; no individual piece is scaled to make a silhouette fit.
"""
import json, math, itertools, os
from shapely.geometry import Polygon, Point, shape
from shapely.affinity import affine_transform, translate
from shapely.ops import unary_union
from concurrent.futures import ThreadPoolExecutor

S = math.sqrt(2)
def arc(cx, cy, r, start, end, n=64):
    return [(cx+r*math.cos(start+(end-start)*i/n),cy+r*math.sin(start+(end-start)*i/n)) for i in range(n+1)]
raw = {
 'circle':arc(0,0,.5,0,math.tau,128),
 'semi-a':arc(0,0,.5,0,math.pi),
 'semi-b':arc(0,0,.5,0,math.pi),
 'triangle':[(0,0),(1,0),(0,1)],
 'trapezoid':[(0,0),(S,0),(S-1,1),(0,1)],
 'center':[(0,0),(2*S,0),(2*S-1,1),(S-1,1),(1/S,1/S)],
 'large':[(0,0),(2*S,0),(2*S-1,1),(0,1)]+arc(0,.5,.5,math.pi/2,-math.pi/2),
}
anchors = {k: (v if len(v)<10 else [v[0],v[len(v)//2],v[-1],(0,0)]) for k,v in raw.items()}
anchors['large']=[(0,0),(2*S,0),(2*S-1,1),(0,1),(0,.5)]
features={
 'telescope':[(89,136),(89,244),(79,254),(128,254),(144,244),(128,228),(128,174),(111,103),(82,77),(52,106),(64,85),(97,89),(141,161)],
 'solar':[(280,177),(296,177),(296,138),(296,111),(323,138),(334,177),(350,177),(350,138),(350,111),(377,138),(389,176),(389,215),(265,215),(215,165),(242,138),(228,152),(309.5,124.5),(363.5,124.5)],
 'horse':[(450,115),(488,153),(542,153),(569,180),(566,229),(527,191),(488,191),(488,223),(450,223),(450,168),(439,180),(412,153),(555.5,166.5),(565,210),(469,223)],
 'moth':[(44,300),(82,338),(120,338),(159,300),(159,407),(121,407),(82,407),(72,380),(44,407),(101,299),(101,337),(101,389),(140,407)],
 'car':[(329,377),(405,301),(405,339),(542,339),(542,377),(503,377),(465,377),(404,377),(365,377),(445,313),(384.5,377),(484,377),(544,358)],
 'gull':[(29,493),(83,493),(160,569),(105,569),(236,493),(290,493),(214,569),(141,589),(179,589),(160,525),(160,589)],
 'cyclist':[(360,567),(436,491),(475,529),(505,529),(532,502),(532,556),(522,567),(495,567),(457,567),(432,567),(394,567),(456,499),(449,505),(413,567),(476,567)],
 'cannon':[(685,84),(754,84),(792,84),(861,84),(861,122),(831,122),(831,161),(792,122),(734,122),(695,161),(695,122),(685,122),(773,84)],
 'rocket':[(992,28),(1030,28),(992,135),(954,174),(992,174),(992,189),(992,227),(992,205),(1030,205),(1030,227),(1030,189),(1030,174),(1068,174),(1030,135),(1011,28),(992,208),(1030,208)],
 'lamp':[(739,224),(778,224),(739,440),(778,440),(797,224),(797,243)],
 'helicopter':[(943,311),(958,311),(996,311),(1103,311),(1065,349),(1034,349),(1007,376),(1019,388),(965,388),(927,349),(954,322),(1117,296),(977,311)],
 'fish':[(723,536),(750,509),(741,480),(815,554),(739,631),(739,594),(723,594),(735,582),(723,571),(723,551),(696,526),(696,580),(817,480),(833,527)],
 'basket':[(997,442),(1074,518),(1074,625),(1035,625),(1035,549),(997,549),(973,492),(973,514)]
}

targets=json.load(open(os.path.join(os.environ['TEMP'],'math-targets.json')))
def recover(name):
 target=shape(targets[name]['polygon']); tol=target.buffer(1.9); d=37.8
 candidates={}
 local_features=features[name][:]
 polys=list(target.geoms) if hasattr(target,'geoms') else [target]
 for poly in polys:
  verts=list(poly.simplify(1.8).exterior.coords)
  for a,b in zip(verts,verts[1:]):
   length=math.dist(a,b)
   if length<15:continue
   for u in [.5,1,2,3,4,1/S,S-1,S,2*S,3*S,4*S,1+S,2+S,2*S-1]:
    t=u*d/length
    if t<1:local_features.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
 for pid,points in raw.items():
  found={}
  for ang,flip in itertools.product(range(8),[1,-1]):
   a=ang*math.pi/4;c,s=math.cos(a),math.sin(a)
   mat=[c*flip*d,-s*d,s*flip*d,c*d,0,0]
   base=affine_transform(Polygon(points).buffer(0),mat)
   for tx,ty in local_features:
    for px,py in anchors[pid]:
     dx=tx-(c*flip*px-s*py)*d;dy=ty-(s*flip*px+c*py)*d
     key=(round(dx/1.5),round(dy/1.5),ang,flip)
     if key in found:continue
     poly=translate(base,dx,dy)
     if poly.difference(tol).area>45:continue
     # Refine translation against the scan without changing shape or size.
     score=poly.difference(target).area
     for ox,oy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]:
      p=translate(poly,ox,oy);v=p.difference(target).area
      if v<score:poly=p;dx+=ox;dy+=oy;score=v
     found[key]=(score,poly,{'id':pid,'x':dx/d,'y':dy/d,'angle':ang*45,'flipped':flip<0})
  vals=sorted(found.values(),key=lambda z:z[0])
  # Remove the same physical shape represented by symmetric orientations.
  unique=[]
  for v in vals:
   if all(v[1].symmetric_difference(w[1]).area>35 for w in unique):unique.append(v)
  candidates[pid]=unique[:180]
 order=['large','center','trapezoid','triangle','circle','semi-a','semi-b']
 best=[float('inf'),None];nodes=[0]
 def dfs(i,chosen,cost):
  nodes[0]+=1
  if cost>=best[0] or nodes[0]>600000:return
  if i==7:
   best[:]=[cost,chosen[:]];return
  for outside,poly,place in candidates[order[i]]:
   overlap=sum(poly.intersection(p).area for p,_ in chosen)
   if overlap>220:continue
   score=outside+overlap*3
   if cost+score>=best[0]:continue
   dfs(i+1,chosen+[(poly,place)],cost+score)
 dfs(0,[],0)
 print(name,{k:len(v) for k,v in candidates.items()},'score',round(best[0],2),'nodes',nodes[0],flush=True)
 if best[1]:
  return name, [p for _,p in best[1]], best[0]
 return name,[],None

if __name__=='__main__':
 import sys
 names=sys.argv[1:] or list(targets)
 out={}
 with ThreadPoolExecutor(max_workers=4) as pool:
  for name,placements,score in pool.map(recover,names):out[name]={'placements':placements,'scanError':score}
 path=os.path.join(os.environ['TEMP'],'math-recovered.json')
 if os.path.exists(path):
  old=json.load(open(path));old.update(out);out=old
 json.dump(out,open(path,'w'),indent=2)


