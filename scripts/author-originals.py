"""Author deterministic new connected silhouettes from the seven canonical pieces."""
import math,itertools,random,json
from shapely.geometry import Polygon
from shapely.affinity import affine_transform,translate
from shapely import set_precision
from shapely.ops import unary_union
S=math.sqrt(2)
def arc(cx,cy,r,a,b,n=64):return [(cx+r*math.cos(a+(b-a)*i/n),cy+r*math.sin(a+(b-a)*i/n)) for i in range(n+1)]
raw={'large':[(0,0),(2*S,0),(2*S-1,1),(0,1)]+arc(0,.5,.5,math.pi/2,-math.pi/2),'center':[(0,0),(2*S,0),(2*S-1,1),(S-1,1),(1/S,1/S)],'trapezoid':[(0,0),(S,0),(S-1,1),(0,1)],'triangle':[(0,0),(1,0),(0,1)],'circle':arc(0,0,.5,0,math.tau,128),'semi-a':arc(0,0,.5,0,math.pi),'semi-b':arc(0,0,.5,0,math.pi)}
def transformed(pid,x,y,angle,flipped):
 a=angle*math.pi/180;c,s=math.cos(a),math.sin(a);f=-1 if flipped else 1
 return set_precision(affine_transform(Polygon(raw[pid]).buffer(0),[c*f,-s,s*f,c,x,y]),1e-7)
def placed(pid,x,y,a=0,f=False):return {'id':pid,'x':x,'y':y,'angle':a,'flipped':f}
def candidates(pid,merged):
 rings=[list(p.exterior.coords) for p in (list(merged.geoms) if hasattr(merged,'geoms') else [merged])]
 # True straight corners and edge centers, never tiny samples on a circular arc.
 anchors=[]
 for r in rings:
  for i,v in enumerate(r[:-1]):
   prev=r[i-1] if i else r[-2];nxt=r[i+1]
   if math.dist(v,prev)>.1 or math.dist(v,nxt)>.1:anchors.append(v)
   if math.dist(v,nxt)>=1:anchors.append(((v[0]+nxt[0])/2,(v[1]+nxt[1])/2))
 seen=set();out=[]
 for a,f in itertools.product(range(0,360,45),[False,True]):
  base=transformed(pid,0,0,a,f)
  local=raw[pid] if len(raw[pid])<10 else [(0,0),(-.5,0),(.5,0)]
  c,s=math.cos(a*math.pi/180),math.sin(a*math.pi/180)
  for point,anchor in itertools.product(anchors,local):
   ax=(-anchor[0] if f else anchor[0]);ay=anchor[1];dx=point[0]-(ax*c-ay*s);dy=point[1]-(ax*s+ay*c)
   key=(round(dx,5),round(dy,5),a,f)
   if key in seen:continue
   seen.add(key);p=set_precision(translate(base,dx,dy),1e-7)
   if p.intersection(merged).area>1e-7:continue
   shared=p.boundary.intersection(merged.boundary).length
   if shared<.24:continue
   joined=merged.union(p);b=joined.bounds;compact=(b[2]-b[0])*(b[3]-b[1])
   out.append((compact-.6*shared,p,placed(pid,dx,dy,a,f)))
 return sorted(out,key=lambda x:x[0])
names=['弧线小站','折角城堡','三角山谷','奇妙桥梁','小小探测器','圆顶营地','欢乐码头','智慧风车','拼板飞船','山间帐篷','创意工坊']
bank=[]
for seed in range(200):
 rng=random.Random(seed*317+29);poses=[placed('large',0,0),placed('circle',0,.5)];merged=unary_union([transformed(**{'pid':p['id'],'x':p['x'],'y':p['y'],'angle':p['angle'],'flipped':p['flipped']}) for p in poses])
 order=['center','trapezoid','triangle'];rng.shuffle(order);order+=['semi-a','semi-b']
 for pid in order:
  options=candidates(pid,merged)
  if not options:break
  _,poly,pose=rng.choice(options[:min(12,len(options))]);poses.append(pose);merged=merged.union(poly)
 if len(poses)!=7:continue
 if any(merged.symmetric_difference(old[1]).area<.1 for old in bank):continue
 assert abs(sum(transformed(p['id'],p['x'],p['y'],p['angle'],p['flipped']).area for p in poses)-merged.area)<1e-6
 bank.append((poses,merged));print('authored',len(bank),'seed',seed,flush=True)
 if len(bank)==11:break
assert len(bank)==11
json.dump([{'id':f'original-{i+1}','name':names[i],'source':'original','placements':p} for i,(p,_) in enumerate(bank)],open('src/data/originals.json','w',encoding='utf8'),ensure_ascii=False,indent=2)
