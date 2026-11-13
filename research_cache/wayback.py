import json,subprocess,time,hashlib,sys,os,urllib.parse
UA='ArsenalProSpecResearch/1.0 (+https://majalen3.github.io/arsenal-pro-bowling/; one-off catalog fact check)'
def get(url,timeout=40):
    time.sleep(3)
    r=subprocess.run(['curl','-sL','-m',str(timeout),'-A',UA,'-w','\n%{http_code}',url],capture_output=True)
    b=r.stdout; i=b.rfind(b'\n'); return b[:i].decode('utf8','ignore'), b[i+1:].decode()
rows=[l.rstrip('\n').split('\t') for l in open('missing_rows.tsv')]
urls=open('wb_urls.txt').read().split()
res=json.load(open('wb/index.json')) if os.path.exists('wb/index.json') else {}
for u in urls:
    if u in res: continue
    cdx='https://web.archive.org/cdx/search/cdx?'+urllib.parse.urlencode({'url':u,'output':'json','fl':'timestamp,statuscode,digest','filter':'statuscode:200','collapse':'digest','limit':'40'})
    body,code=get(cdx)
    try: data=json.loads(body)[1:]
    except Exception: res[u]={'cdx':code,'caps':[]}; json.dump(res,open('wb/index.json','w')); continue
    caps=[]
    if data:
        pick=[data[0],data[-1]]
        seen=set()
        for ts,sc,dg in pick:
            if ts in seen: continue
            seen.add(ts)
            raw=f'https://web.archive.org/web/{ts}id_/{u}'
            b,c=get(raw)
            f=f'wb/{hashlib.sha1((u+ts).encode()).hexdigest()[:16]}.html'
            if c=='200': open(f,'w').write(b)
            caps.append({'ts':ts,'code':c,'file':f if c=='200' else None,'n':len(data)})
    res[u]={'cdx':code,'caps':caps}
    json.dump(res,open('wb/index.json','w'))
    print(u,len(data),[c['ts'] for c in caps],flush=True)
print('DONE')
