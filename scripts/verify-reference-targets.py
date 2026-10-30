"""Reconstruct exact reference silhouettes from their dimension relationships."""
import sys,os,json,math
sys.path.insert(0,os.environ['TEMP'])
from source_solver_child import solve,place,Polygon,S

out={}
target=Polygon([(0,0),(1,1),(2,1),(3,0),(3,2*S),(2,2*S),(2,S+1),(1,S+1),(1/S,3/S),(0,2*S)])
poses=solve(target,[place('large',3,2*S,90,True)])
if poses:out['moth']=poses+[place('circle',1.5,-.5),place('semi-a',1.5,1,180),place('semi-b',1.5,S+1)]
target=Polygon([(0,0),(1,1),(1+S,1),(2+S,2),(3,2),(3,3),(2,2),(1,2),(1,2*S),(0,2*S),(0,S),(1/S-1,1+1/S),(-1,1)])
print('horse target area',target.area,4*S,flush=True)
poses=solve(target,[place('large',0,2*S,270)])
if poses:out['horse']=poses+[place('circle',.5,2*S),place('semi-a',3,2.5,270),place('semi-b',1+S+math.sqrt(3)/4,1.25,210)]
n=S-1;u=1-1/S
target=Polygon([(0,0),(2,2),(0,4),(0,3),(-n,3),(-n+u,3-u),(-n,1+S),(-n,1),(-1/S,1/S)])
target=target.union(Polygon([(-n,2),(-n-1/S,2-1/S),(-n-1/S,2+1/S)]))
print('fish target area',target.area,4*S,flush=True)
poses=solve(target,[place('large',0,0,45)])
if poses:out['fish']=poses+[place('circle',2.05,0),place('semi-a',2.45,1.25),place('semi-b',2.45,1.25,180)]
target=Polygon([(0,0),(2,-2),(2+1/S,-2+1/S),(1+3/S,-1-1/S),(1+2*S,-1),(1+5/S,-1-1/S),(1+5/S,-1+1/S),(3*S,0)])
print('cyclist target area',target.area,4*S,flush=True)
poses=solve(target,[place('large',2,-2,315,True)])
if poses:out['cyclist']=poses+[place('circle',96/38,-68/38),place('semi-a',S,0),place('semi-b',116.5/38,0)]
json.dump(out,open(os.path.join(os.environ['TEMP'],'source-exact-root.json'),'w'),indent=2)

