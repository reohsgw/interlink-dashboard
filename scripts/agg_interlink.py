import gzip,json,sys,collections,pickle,hashlib,zipfile
from multiprocessing import Pool
KST=9*3600
def day(t): return (t//1000+KST)//86400
ZIPS=['Archive.zip','Archive 2.zip','Archive 3.zip','Archive 4.zip']   # beta only (10/12-10/22); the telemetry*.zip files are an earlier partial copy of 10/12-10/14 and are not read
def days(root):
    out=collections.defaultdict(list)
    for zn in ZIPS:
        for n in zipfile.ZipFile(root+'/'+zn).namelist():
            if n.endswith('.gz') and not n.startswith('__MACOSX'): out[n.split('/')[0]].append((root+'/'+zn,n))
    return sorted(out.items())
def work(job):
    dname,files=job
    seen=set(); rows=0; dups=0                 # duplicates only occur between hourly files of the same day, so dedupe per day
    mins=collections.defaultdict(set)          # (a,w) -> minute set
    zones=collections.defaultdict(set)         # a -> (w,cx,cz)
    grid=collections.Counter()                 # (a,w,gx,gz) move samples (non-dungeon)
    counted=[]                                 # (eid_hash, kind, key...)
    places=[]                                  # (eid,a,w,x,z,bid,day)
    qdone=collections.defaultdict(set); qtouch=collections.defaultdict(set); qfirst=collections.Counter()
    for zp,n in files:
      for line in gzip.open(zipfile.ZipFile(zp).open(n),'rt'):
        e=json.loads(line); rows+=1
        k=hashlib.blake2b(e['eventId'].encode(),digest_size=8).digest()
        if k in seen: dups+=1; continue
        seen.add(k)
        et=e['eventType']; a=e.get('actorId'); ctx=e.get('context') or {}; p=e.get('payload'); t=e.get('occurredAt') or 0
        pr=e['producer']; w=ctx.get('worldId')
        if pr=='client' and a and w:
            mins[(a,w)].add(t//60000)
            if et=='move' and isinstance(p,dict) and 'x' in p:
                x=p['x']; z=p['z']
                zones[a].add((w,int(x//16),int(z//16)))
                if not w.startswith('dungeon:'): grid[(a,w,int(x//4),int(z//4))]+=1
                continue
        h=e['eventId']
        if et=='block_place' and a:
            pos=p.get('pos') or {}
            places.append((h,a,w,pos.get('x'),pos.get('y'),pos.get('z'),p.get('blockId'),day(t)))
        elif et=='block_change_resolved' and a:
            inp=p.get('input') or {}; r=((p.get('result') or {}).get('result') or {})
            if r.get('accepted'):
                bp=inp.get('blockPacked')
                counted.append((h,'dug' if bp==0 else 'set',a,(bp & 0x3FFFF) if bp else 0))
        elif et=='attack_started' and a:
            counted.append((h,'atk',a,0))
        elif et=='character_died' and isinstance(p,dict) and p.get('kind')=='monster':
            for c in (p.get('contributors') or [])[:4]: counted.append((h+c,'kill',c,p.get('monsterId')))
        elif et=='character_died' and a and isinstance(p,dict) and p.get('kind')=='player':
            counted.append((h,'death',a,0))
        elif et=='craft_round_resolved' and a and isinstance(p,dict) and p.get('outcome')=='success':
            counted.append((h,'craft',a,(p.get('input') or {}).get('recipeId')))
        elif et=='quest_changed' and pr=='worker' and isinstance(p,dict) and 'questId' in p and a:
            q=p['questId']; qtouch[a].add(q)
            if p.get('completed'): qdone[a].add((q,p.get('periodKey')))
            if not qfirst[q] or t<qfirst[q]: qfirst[q]=t
        elif et=='quest_changed' and pr=='bridge' and a:
            counted.append((h,'claim',a,0))
        elif et=='chat_send' and a and isinstance(p,dict) and str(p.get('msg','')).startswith('/'):
            counted.append((h,'cmd',a,str(p.get('msg'))[:12]))
        elif et=='world_enter_intent' and a and isinstance(p,dict):
            counted.append((h,'enter',a,(w,p.get('worldType'),p.get('slug'),p.get('source'),t)))
    return dict(mins),dict(zones),grid,counted,places,dict(qdone),dict(qtouch),dict(qfirst),(dname,rows,dups)
if __name__=='__main__':
    M=collections.defaultdict(set); Z=collections.defaultdict(set); G=collections.Counter(); seen=set(); C=[]; DAYS=[]; PL=[]; QD=collections.defaultdict(set); QT=collections.defaultdict(set)
    with Pool(4) as pool:
        for m,z,g,c,pl,qd,qt,qf,dr in pool.imap_unordered(work,days(sys.argv[1])):
            DAYS.append(dr)
            for k,v in m.items(): M[k]|=v
            for k,v in z.items(): Z[k]|=v
            G+=g
            for r in c:
                if r[0] in seen: continue
                seen.add(r[0]); C.append(r[1:])
            for r in pl:
                if r[0] in seen: continue
                seen.add(r[0]); PL.append(r[1:])
            for k,v in qd.items(): QD[k]|=v
            for k,v in qt.items(): QT[k]|=v
    pickle.dump(dict(M=dict(M),Z={k:len(v) for k,v in Z.items()},G=G,C=C,PL=PL,QD=dict(QD),QT=dict(QT),DAYS=sorted(DAYS)),open(sys.argv[2],'wb'))
    print('done',len(M),len(Z),len(G),len(C),len(PL))
