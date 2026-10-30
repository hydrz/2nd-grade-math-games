import math,itertools,json,os
from shapely.geometry import Polygon
from shapely.affinity import affine_transform,translate
S=math.sqrt(2)
target=Polygon([(0,0),(2,2),(2,2+2*S),(1,2+2*S),(1,2*S),(0,2*S)])
raw={'large':[(0,0),(2*S,0),(2*S-1,1),(0,1)],'triangle':[(0,0),(1,0),(0,1)],'trap':[(0,0),(S,0),(S-1,1),(0,1)]}
verts=list(target.exterior.coords)
features=verts[:]
for a,b in zip(verts,verts[1:]):
 l=math.dist(a,b)
 for u in [.5,1,2,3,4,1/S,S-1,S,2*S,3*S,4*S,1+S,2+S,2*S-1]:
  t=u/l
  if t<1:features.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
candidates={}
for pid,points in raw.items():
 found=[]
 for ang,f in itertools.product(range(8),[1,-1]):
  a=ang*math.pi/4;c,s=math.cos(a),math.sin(a);poly=affine_transform(Polygon(points),[c*f,-s,s*f,c,0,0])
  for tx,ty in features:
   for px,py in list(poly.exterior.coords)[:-1]:
    dx,dy=tx-px,ty-py;p=translate(poly,dx,dy)
    if p.difference(target).area<1e-7 and all(p.symmetric_difference(q).area>1e-6 for q,_ in found):found.append((p,[dx,dy,ang*45,f<0]))
 candidates[pid]=found;print(pid,len(found),flush=True)
result=[]
for (l,lp),(t,tp),(r,rp) in itertools.product(*candidates.values()):
 if l.intersection(t).area+l.intersection(r).area+t.intersection(r).area>1e-7:continue
 rem=target.difference(l.union(t).union(r)).simplify(1e-6)
 if rem.geom_type!='Polygon' or len(rem.exterior.coords)!=6:continue
 p=list(rem.exterior.coords);lens=[round(math.dist(a,b),5) for a,b in zip(p,p[1:])]
 result.append({'points':p,'edges':lens,'large':lp,'triangle':tp,'trapezoid':rp})
print(json.dumps(result[:20],indent=2));json.dump(result,open(os.path.join(os.environ['TEMP'],'inferred-center.json'),'w'))
