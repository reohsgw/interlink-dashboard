import pickle,collections,json,datetime,os,base64,io
from PIL import Image
d=pickle.load(open('interlink.pkl','rb'))
items={i['itemId']:i for i in json.load(open('data/akkadia-items/akkadia-items/item-definitions/items.json'))}
IMG='data/akkadia-blocks/akkadia-blocks/block-images/preview/'
K=datetime.timezone(datetime.timedelta(hours=9)); D0=datetime.date(2026,10,12)
M=d['M']
def kind(w):
    if w=='personal:akkadia-hub': return 'Hub'
    if w.startswith('dungeon:'): return 'Dungeon'
    if 'personal-world' in w: return 'Personal world'
    if w=='personal:akkadia-mars': return 'Mars'
    if w=='personal:akkadia-alexandria-library': return 'Library'
    return 'Other'
pm=collections.Counter(); pk=collections.defaultdict(collections.Counter); pdays=collections.defaultdict(set); wmin=collections.Counter()
daymin=collections.defaultdict(collections.Counter)
for (a,w),s in M.items():
    k=kind(w); pm[a]+=len(s); pk[a][k]+=len(s); wmin[w]+=len(s)
    for m in s:
        dd=(datetime.datetime.fromtimestamp(m*60,K).date()-D0).days; pdays[a].add(dd); daymin[a][dd]+=1
cnt=collections.defaultdict(collections.Counter); kills=collections.Counter()
for r in d['C']:
    cnt[r[0]][r[1]]+=1
    if r[0]=='kill': kills[r[1]]+=1
pl=collections.Counter(r[0] for r in d['PL'])
players=sorted(pm,key=lambda a:-pm[a])
alias={a:f'P{i+1:03d}' for i,a in enumerate(players)}
# types
long=[a for a in players if pm[a]>=30]
def rank(vals):
    s=sorted(vals.values()); n=len(s)
    return {a:sum(1 for x in s if x<v)/(n-1) for a,v in vals.items()}
# type rule (11/03, team v5): <30 min short; low edits+kills -> Explorer (hub stayer); else build score vs fight score (no percentiles)
rates={'Builder':{a:(pl[a]+cnt['dug'][a])/pm[a] for a in long},'Fighter':{a:kills[a]/pm[a] for a in long},'Explorer':{a:d['Z'].get(a,0)/pm[a] for a in long}}
R={k:rank(v) for k,v in rates.items()}
SB={a:(pl[a]+cnt['dug'][a])/pm[a]/3 for a in players}; SF={a:kills[a]/pm[a]/0.6 for a in players}
ptype={}
for a in players:
    if pm[a]<30: ptype[a]='Short visit'
    elif (pl[a]+cnt['dug'][a])/pm[a]<0.2 and kills[a]/pm[a]<0.1: ptype[a]='Explorer'   # low activity -> hub stayer
    elif SB[a]>=SF[a]: ptype[a]='Builder'
    else: ptype[a]='Fighter'
TYPES=['Builder','Fighter','Explorer','Short visit']
QSTART=datetime.datetime(2026,10,15,18,6,tzinfo=K)
qactive={a for a in players if any(dd>=3 for dd in pdays[a])}
GROUP={'r':'Gathering','m':'Monster hunt','w':'Workstation use','c':'Dungeon clear','h':'Craft & finish','f':'Facility upgrade','b':'Journey B','d':'Journey D','o':'Journey O'}
def qgroup(q):
    p=q.split('_')[1]; return GROUP.get(p[0],'Other')
P=[]
for a in players:
    qd=d['QD'].get(a,set())
    P.append(dict(id=alias[a],type=ptype[a],minutes=pm[a],zones=d['Z'].get(a,0),placed=pl[a],dug=cnt['dug'][a],attacks=cnt['atk'][a],kills=kills[a],
        crafts=cnt['craft'][a],deaths=cnt['death'][a],days=len(pdays[a]),quests=len(qd),questActive=a in qactive,
        kinds=dict(pk[a]),dl=sorted(pdays[a]),qg=dict(collections.Counter(qgroup(q) for q,_ in qd)),
        rb=round(R['Builder'].get(a,0),2),rf=round(R['Fighter'].get(a,0),2),re=round(R['Explorer'].get(a,0),2),sb=round(SB[a],2),sf=round(SF[a],2)))
# sankey type->world kind
sank=collections.Counter()
for a in players:
    for k,v in pk[a].items(): sank[(ptype[a],k)]+=v
# blocks per type
bt=collections.defaultdict(collections.Counter); pdist=collections.defaultdict(set)
for a,w,x,y,z,bid,dd in d['PL']:
    if bid is None: continue
    bt[ptype[a]][bid]+=1; pdist[a].add(bid)
need=set()
btop={}
for t in TYPES:
    tot=sum(bt[t].values()); btop[t]=dict(total=tot,top=[[b,c] for b,c in bt[t].most_common(10)],
        distinct=round(sum(len(pdist[a]) for a in players if ptype[a]==t and pdist[a])/max(1,sum(1 for a in players if ptype[a]==t and pdist[a])),1),
        placers=sum(1 for a in players if ptype[a]==t and pdist[a]))
    need|={b for b,_ in bt[t].most_common(10)}
# blocks per type x world kind (11/03)
BK=['Personal world','Dungeon','Mars','Hub']
btk=collections.defaultdict(collections.Counter); pdk=collections.defaultdict(set); bpck=collections.defaultdict(collections.Counter)
for a,w,x,y,z,bid,dd in d['PL']:
    if bid is None: continue
    k=kind(w)
    if k not in BK: continue
    btk[(k,ptype[a])][bid]+=1; pdk[(k,a)].add(bid); bpck[(k,ptype[a],bid)][alias[a]]+=1
btopK={k:{} for k in BK}; bpK={k:{} for k in BK}
for k in BK:
    for t in TYPES:
        c=btk[(k,t)]; pls=[a for a in players if ptype[a]==t and pdk[(k,a)]]
        btopK[k][t]=dict(total=sum(c.values()),top=[[b,n] for b,n in c.most_common(10)],distinct=round(sum(len(pdk[(k,a)]) for a in pls)/max(1,len(pls)),1),placers=len(pls))
        bpK[k][t]={b:bpck[(k,t,b)].most_common() for b,_ in c.most_common(10)}
        need|={b for b,_ in c.most_common(10)}
# map worlds
top_personal=[w for w,_ in sorted(((w,m) for w,m in wmin.items() if 'personal-world' in w),key=lambda x:-x[1])[:3]]
MAPW=['personal:akkadia-hub']+top_personal
grid=collections.defaultdict(collections.Counter)
for (a,w,gx,gz),c in d['G'].items():
    if w in MAPW: grid[w][(ptype[a],gx,gz)]+=c
maps={}
for w in MAPW:
    cells=[[t,gx,gz,c] for (t,gx,gz),c in grid[w].items()]
    E0=(datetime.date(2026,10,12)-datetime.date(1970,1,1)).days
    pts=[[x,z,bid,ptype[a],dd-E0] for a,ww,x,y,z,bid,dd in d['PL'] if ww==w and x is not None]
    for p in pts: need.add(p[2])
    maps[w]=dict(name=w.split(':')[1],minutes=wmin[w],cells=cells,blocks=pts,players=len({a for (a,ww) in M if ww==w}))
blocks={}
for bid in need:
    it=items.get(bid,{}); img=None; col=None; dd=IMG+str(bid)
    if os.path.isdir(dd):
        fs=[f for f in ('full@64.png','plant@64.png','fluid@64.png') if os.path.exists(dd+'/'+f)] or [f for f in os.listdir(dd) if f.endswith('@64.png')]
        if fs:
            raw=open(dd+'/'+fs[0],'rb').read(); im=Image.open(io.BytesIO(raw)).convert('RGBA')
            px=[p for p in im.getdata() if p[3]>128]
            if px: col='#%02x%02x%02x'%tuple(sum(p[i] for p in px)//len(px) for i in range(3))
            if bid in {b for t in TYPES for b,_ in bt[t].most_common(10)} | {b for k in BK for t in TYPES for b,_ in btk[(k,t)].most_common(10)}: img='data:image/png;base64,'+base64.b64encode(raw).decode()
    blocks[bid]=dict(name=it.get('displayMetadata',{}).get('name',str(bid)),img=img,col=col,cat=it.get('miningCategory'))
daily=[[sum(1 for a in players if ptype[a]==t and dd in pdays[a]) for dd in range(11)] for t in TYPES]
qgt={t:collections.Counter() for t in TYPES}
for p in P:
    for g,c in p['qg'].items(): qgt[p['type']][g]+=c
# per-player counts for each type's top-10 blocks (data panel)
bpc=collections.defaultdict(collections.Counter)
for a,w,x,y,z,bid,dd in d['PL']:
    if bid is not None: bpc[(ptype[a],bid)][alias[a]]+=1
bp={t:{b:bpc[(t,b)].most_common() for b,_ in btop[t]['top']} for t in TYPES}
out=dict(players=P,bp=bp,btopK=btopK,bpK=bpK,dayRows=[[dn,r,x] for dn,r,x in d['DAYS']],types=TYPES,sankey=[[a,b,c] for (a,b),c in sank.items()],blocks=blocks,btop=btop,maps=maps,mapOrder=MAPW,daily=daily,
    qgt={t:dict(v) for t,v in qgt.items()},groups=list(GROUP.values()),
    meta=dict(players=len(players),rows=sum(r for _,r,_ in d['DAYS']),dups=sum(x for _,_,x in d['DAYS']),start='2026-10-12 18:39',end='2026-10-22 15:51',qstart='2026-10-15 18:06',
              placed=sum(pl.values()),dungeons=sum(1 for w in wmin if w.startswith('dungeon:')),personal=sum(1 for w in wmin if 'personal-world' in w),
              blockTypes=len({r[5] for r in d['PL']}),questIds=len({q for s in d['QT'].values() for q in s})))
s=json.dumps(out,separators=(',',':')); open('interlink_data.json','w').write(s)
print(len(s)//1000,'KB',collections.Counter(ptype.values()),MAPW,[ (w,len(maps[w]['cells']),len(maps[w]['blocks'])) for w in MAPW])
for t in TYPES:
    g=[p for p in P if p['type']==t]; print(t,len(g),'min',sum(p['minutes'] for p in g),'placed',sum(p['placed'] for p in g),'atk',sum(p['attacks'] for p in g),'q',sum(p['quests'] for p in g), [ (blocks[b]['name'],c) for b,c in btop[t]['top'][:4]], btop[t]['distinct'])
