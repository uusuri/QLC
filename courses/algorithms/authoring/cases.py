"""Independent definition-based small oracles and explicit adversarial large families."""
import itertools as it
import random
from collections import deque
from functools import lru_cache

def lines(xs): return ''.join(str(x)+'\n' for x in xs)
def row(xs): return ' '.join(map(str,xs))+'\n'
def test(inp, expected, kind): return dict(input=inp, output=str(expected) if isinstance(expected,str) else lines([expected]), kind=kind)
def array_case(a, output, kind, extra=()): return test(row([len(a),*extra])+row(a),output,kind)

def reach(n, edges, start, directed=False, skip_v=-1, skip_e=-1):
    g=[[] for _ in range(n)]
    for i,(u,v,*_) in enumerate(edges):
        if i==skip_e or skip_v in (u,v): continue
        g[u].append(v)
        if not directed:g[v].append(u)
    d=[-1]*n
    if start==skip_v:return d
    d[start]=0;q=deque([start])
    while q:
        u=q.popleft()
        for v in g[u]:
            if d[v]<0:d[v]=d[u]+1;q.append(v)
    return d

def components(n,e,skip_v=-1,skip_e=-1):
    used=set();ans=0
    for i in range(n):
        if i==skip_v or i in used:continue
        ans+=1;used.update(j for j,d in enumerate(reach(n,e,i,skip_v=skip_v,skip_e=skip_e)) if d>=0)
    return ans

def bellman(n,e,s):
    d=[None]*n;d[s]=0
    for _ in range(n-1):
        old=d[:]
        for u,v,w in e:
            if old[u] is not None and (d[v] is None or d[v]>old[u]+w):d[v]=old[u]+w
    return d

def graph_input(n,e,extra=()):return row([n,len(e),*extra])+''.join(row([u+1,v+1,*rest]) for u,v,*rest in e)

def small(key, seed):
    r=random.Random(seed);n=r.randint(1,9);a=[r.randint(-5,5) for _ in range(n)];kind=f'oracle-seed-{seed}'
    if key=='sum':return array_case(a,sum(a),kind)
    if key=='increasing-run':
        ans=max(j-i for i in range(n) for j in range(i+1,n+1) if all(a[k]<a[k+1] for k in range(i,j-1)))
        return array_case(a,ans,kind)
    if key in ('range-sum','distinct-range'):
        qs=[sorted((r.randint(1,n),r.randint(1,n))) for _ in range(12)]
        ans=[sum(a[l-1:h]) if key=='range-sum' else len(set(a[l-1:h])) for l,h in qs]
        return test(row([n,len(qs)])+row(a)+''.join(row(q) for q in qs),lines(ans),kind)
    if key=='range-add':
        a=[0]*n;qs=[]
        for _ in range(12):
            l,h=sorted((r.randint(1,n),r.randint(1,n)));x=r.randint(-5,5);qs.append((l,h,x))
            for i in range(l-1,h):a[i]+=x
        return test(row([n,len(qs)])+''.join(row(q) for q in qs),lines(a),kind)
    if key=='inversions':return array_case(a,sum(a[i]>a[j] for i in range(n) for j in range(i+1,n)),kind)
    if key in ('union-length','interval-choice','weighted-intervals'):
        arr=[]
        for _ in range(n):
            l=r.randint(0,10);h=r.randint(l+1,13);arr.append((l,h,r.randint(0,20)))
        if key=='union-length':ans=len(set(x for l,h,_ in arr for x in range(l,h)))
        else:
            ans=0
            for mask in range(1<<n):
                ss=sorted(arr[i] for i in range(n) if mask>>i&1)
                if all(ss[i][1]<=ss[i+1][0] for i in range(len(ss)-1)):
                    ans=max(ans,sum(x[2] for x in ss) if key=='weighted-intervals' else len(ss))
        return test(row([n])+''.join(row(x if key=='weighted-intervals' else x[:2]) for x in arr),ans,kind)
    if key=='capacity':
        a=[r.randint(1,12) for _ in range(n)];k=r.randint(1,n);ans=sum(a)
        for cuts in it.combinations(range(1,n),k-1):
            bounds=(0,*cuts,n);ans=min(ans,max(sum(a[bounds[j]:bounds[j+1]]) for j in range(k)))
        return array_case(a,ans,kind,(k,))
    if key=='spacing':
        n=r.randint(2,9);a=r.sample(range(-20,21),n);k=r.randint(2,n)
        ans=max(min(y-x for x,y in zip(c,c[1:])) for c in it.combinations(sorted(a),k))
        return array_case(a,ans,kind,(k,))
    if key=='short-window':
        a=[r.randint(1,10) for _ in range(n)];s=r.randint(1,sum(a)+10)
        lengths=[j-i for i in range(n) for j in range(i+1,n+1) if sum(a[i:j])>=s]
        return array_case(a,min(lengths,default=0),kind,(s,))
    if key=='close-pairs':
        k=r.randint(0,8);return array_case(a,sum(abs(a[i]-a[j])<=k for i in range(n) for j in range(i+1,n)),kind,(k,))
    if key=='next-smaller':
        return array_case(a,lines(next((j+1 for j in range(i+1,n) if a[j]<a[i]),-1) for i in range(n)),kind)
    if key=='window-min':
        k=r.randint(1,n);return array_case(a,lines(min(a[i:i+k]) for i in range(n-k+1)),kind,(k,))
    if key=='merge-cost':
        a=[r.randint(1,12) for _ in range(r.randint(1,7))]
        @lru_cache(None)
        def f(state):
            if len(state)==1:return 0
            return min(state[i]+state[j]+f(tuple(sorted([state[k] for k in range(len(state)) if k not in (i,j)]+[state[i]+state[j]]))) for i in range(len(state)) for j in range(i+1,len(state)))
        return array_case(a,f(tuple(sorted(a))),kind)
    if key in ('ordered-set','treap-order'):
        data=[];ops=[];ans=[]
        for j in range(30):
            op=r.choice('++--??') if j<29 else '?';x=r.randint(-8,8)
            if op=='+':
                if key=='treap-order' or x not in data:data.append(x)
            elif op=='-':
                if x in data:data.remove(x)
            elif key=='ordered-set':ans.append(min((v for v in data if v>=x),default='NONE'))
            else:
                x=r.randint(1,len(data)+2);ans.append(sorted(data)[x-1] if x<=len(data) else 'NONE')
            ops.append((op,x))
        return test(row([len(ops)])+''.join(row(x) for x in ops),lines(ans),kind)
    if key=='subarray-target':
        k=r.randint(-8,8);return array_case(a,sum(sum(a[i:j])==k for i in range(n) for j in range(i+1,n+1)),kind,(k,))
    if key=='coins':
        c=[r.randint(1,12) for _ in range(r.randint(1,6))];s=r.randint(0,30);dist={0:0};queue=deque([0])
        while queue:
            u=queue.popleft()
            for x in c:
                if u+x<=s and u+x not in dist:dist[u+x]=dist[u]+1;queue.append(u+x)
        return array_case(c,dist.get(s,-1),kind,(s,))
    if key=='lis':
        ans=0
        for mask in range(1<<n):
            ss=[a[i] for i in range(n) if mask>>i&1]
            if all(x<y for x,y in zip(ss,ss[1:])):ans=max(ans,len(ss))
        return array_case(a,ans,kind)
    if key=='knapsack':
        w=r.randint(0,20);items=[(r.randint(1,12),r.randint(0,30)) for _ in range(n)]
        ans=max(sum(items[i][1] for i in range(n) if mask>>i&1) for mask in range(1<<n) if sum(items[i][0] for i in range(n) if mask>>i&1)<=w)
        return test(row([n,w])+''.join(row(x) for x in items),ans,kind)
    if key=='edit-distance':
        x=''.join(r.choices('abc',k=r.randint(1,5)));y=''.join(r.choices('abc',k=r.randint(1,5)))
        def f(i,j):
            if not i:return j
            if not j:return i
            return min(f(i-1,j)+1,f(i,j-1)+1,f(i-1,j-1)+(x[i-1]!=y[j-1]))
        return test(x+'\n'+y+'\n',f(len(x),len(y)),kind)
    if key in ('bfs','bipartite','dag-longest','scc','dijkstra','floyd','mst','bridges','articulation','flow'):
        n=r.randint(2,8) if key=='flow' else r.randint(1,8);m=r.randint(0,14)
        e=[(r.randrange(n),r.randrange(n)) for _ in range(m)]
        if key=='bfs':
            s=r.randrange(n);return test(graph_input(n,e,(s+1,)),lines(reach(n,e,s)),kind)
        if key=='bipartite':
            ok=any(all(((mask>>u)&1)!=((mask>>v)&1) for u,v in e) for mask in range(1<<n))
            return test(graph_input(n,e),'YES\n' if ok else 'NO\n',kind)
        if key=='dag-longest':
            g=[[] for _ in range(n)]
            for u,v in e:g[u].append(v)
            cycle=False;best=0
            def dfs(u,path):
                nonlocal cycle,best
                if u in path:cycle=True;return
                best=max(best,len(path))
                for v in g[u]:dfs(v,path+(u,))
            for s in range(n):dfs(s,())
            return test(graph_input(n,e),-1 if cycle else best,kind)
        if key=='scc':
            rr=[reach(n,e,s,True) for s in range(n)]
            return test(graph_input(n,e),sum(not any(rr[i][j]>=0 and rr[j][i]>=0 for j in range(i)) for i in range(n)),kind)
        if key=='dijkstra':
            e=[(u,v,r.randint(0,12)) for u,v in e];s=r.randrange(n)
            return test(graph_input(n,e,(s+1,)),lines(-1 if x is None else x for x in bellman(n,e,s)),kind)
        if key=='floyd':
            potential=[r.randint(-8,8) for _ in range(n)]
            e=[(u,v,r.randint(0,12)+potential[v]-potential[u]) for u,v in e]
            qs=[(r.randrange(n),r.randrange(n)) for _ in range(10)]
            ans=[bellman(n,e,s)[t] for s,t in qs]
            return test(graph_input(n,e,(len(qs),))+''.join(row([s+1,t+1]) for s,t in qs),lines('INF' if x is None else x for x in ans),kind)
        if key=='mst':
            e=[(u,v,r.randint(-8,12)) for u,v in e];best=None
            for ss in it.combinations(e,n-1):
                if components(n,ss)==1:
                    w=sum(x[2] for x in ss);best=w if best is None else min(best,w)
            return test(graph_input(n,e),'DISCONNECTED\n' if best is None else best,kind)
        if key in ('bridges','articulation'):
            base=components(n,e)
            ans=sum(components(n,e,skip_e=i)>base for i in range(m)) if key=='bridges' else sum(components(n,e,skip_v=i)>base for i in range(n))
            return test(graph_input(n,e),ans,kind)
        if key=='flow':
            e=[(u,v,r.randint(0,15)) for u,v in e if u!=v]
            ans=min(sum(c for u,v,c in e if (mask>>u&1) and not(mask>>v&1)) for mask in range(1<<n) if mask&1 and not(mask>>(n-1)&1))
            return test(graph_input(n,e),ans,kind)
    if key=='connectivity':
        e=[];ops=[];ans=[]
        for j in range(30):
            u,v=r.randrange(n),r.randrange(n);c=r.choice('++?') if j<29 else '?';ops.append((c,u+1,v+1))
            if c=='+':e.append((u,v))
            else:ans.append('YES' if reach(n,e,u)[v]>=0 else 'NO')
        return test(row([n,len(ops)])+''.join(row(x) for x in ops),lines(ans),kind)
    if key in ('kmp','period','sam','aho'):
        text=''.join(r.choices('abc',k=r.randint(1,20)))
        if key=='kmp':
            p=''.join(r.choices('abc',k=r.randint(1,9)))
            return test(p+'\n'+text+'\n',sum(text[i:i+len(p)]==p for i in range(len(text)-len(p)+1)),kind)
        if key=='period':return test(text+'\n',next(k for k in range(1,len(text)+1) if len(text)%k==0 and text[:k]*(len(text)//k)==text),kind)
        if key=='sam':return test(text+'\n',len({text[i:j] for i in range(len(text)) for j in range(i+1,len(text)+1)}),kind)
        ps=[''.join(r.choices('abc',k=r.randint(1,6))) for _ in range(r.randint(1,9))]
        return test(row([len(ps)])+'\n'.join(ps)+'\n'+text+'\n',lines(sum(text[i:i+len(p)]==p for i in range(len(text)-len(p)+1)) for p in ps),kind)
    if key=='jump-score':
        k=r.randint(1,n)
        def f(i):return a[i]+(0 if i==0 else max(f(j) for j in range(max(0,i-k),i)))
        return array_case(a,f(n-1),kind,(k,))
    if key in ('fenwick','max-subarray','lazy-max','treap-sequence'):
        initial=a[:];qs=[];ans=[]
        for j in range(15):
            l,h=sorted((r.randint(1,n),r.randint(1,n)));x=r.randint(-7,7)
            if key=='max-subarray':
                qs.append((l,x));a[l-1]=x;ans.append(max([0]+[sum(a[i:k]) for i in range(n) for k in range(i+1,n+1)]))
            elif key=='treap-sequence':
                op=r.choice('RS') if j<14 else 'S';qs.append((op,l,h))
                if op=='R':a[l-1:h]=a[l-1:h][::-1]
                else:ans.append(sum(a[l-1:h]))
            else:
                op=r.choice('+?') if j<14 else '?'
                if op=='?':qs.append((op,l,h));ans.append(max(a[l-1:h]) if key=='lazy-max' else sum(a[l-1:h]))
                elif key=='fenwick':qs.append((op,l,x));a[l-1]+=x
                else:
                    qs.append((op,l,h,x))
                    for i in range(l-1,h):a[i]+=x
        return test(row([n,len(qs)])+row(initial)+''.join(row(x) for x in qs),lines(ans),kind)
    if key in ('tree-distance','tree-max'):
        e=[(i,r.randrange(i),r.randint(-10,10)) for i in range(1,n)];g=[[] for _ in range(n)]
        for u,v,w in e:g[u].append((v,w));g[v].append((u,w))
        qs=[(r.randrange(n),r.randrange(n)) for _ in range(15)];ans=[]
        def path(u,v,parent):
            if u==v:return []
            for x,w in g[u]:
                if x!=parent:
                    p=path(x,v,u)
                    if p is not None:return [w]+p
            return None
        for s,t in qs:
            p=path(s,t,-1);ans.append(sum(p) if key=='tree-distance' else max(p,default=0))
        return test(row([n,len(qs)])+''.join(row([u+1,v+1,w]) for u,v,w in e)+''.join(row([s+1,t+1]) for s,t in qs),lines(ans),kind)
    if key=='matching':
        n,m=r.randint(1,7),r.randint(1,7);e=[(r.randrange(n),r.randrange(m)) for _ in range(r.randint(0,20))]
        @lru_cache(None)
        def f(u,mask):
            if u==n:return 0
            return max([f(u+1,mask)]+[1+f(u+1,mask|1<<v) for x,v in e if x==u and not(mask>>v&1)])
        return test(row([n,m,len(e)])+''.join(row([u+1,v+1]) for u,v in e),f(0,0),kind)
    if key=='tsp':
        n=r.randint(1,7);c=[[r.randint(0,20) if i!=j else 0 for j in range(n)] for i in range(n)]
        ans=min(sum(c[x][y] for x,y in zip((0,*p),(*p,0))) for p in it.permutations(range(1,n)))
        return test(row([n])+''.join(row(x) for x in c),ans,kind)
    if key=='domino':
        n,m=r.randint(1,4),r.randint(1,5)
        @lru_cache(None)
        def f(mask):
            if mask==(1<<(n*m))-1:return 1
            i=next(i for i in range(n*m) if not(mask>>i&1));ans=0
            for j in (i+1 if i%m+1<m else -1,i+m if i+m<n*m else -1):
                if j>=0 and not(mask>>j&1):ans+=f(mask|1<<i|1<<j)
            return ans
        return test(row([n,m]),f(0),kind)
    raise ValueError(key)
def stress(key):
    n=200000;q=50000;k='max-size-adversarial'
    if key=='sum':return [array_case([10**9]*n,n*10**9,k),array_case([-10**9]*n,-n*10**9,'negative-overflow')]
    if key=='increasing-run':return [array_case(list(range(n)),n,k),array_case([3]*n,1,'equal-values')]
    if key in ('range-sum','distinct-range'):
        arr=[10**9]*n
        ans=n*10**9 if key=='range-sum' else 1
        return [test(row([n,q])+row(arr)+row([1,n])*q,lines([ans]*q),k),test('1 200000\n-7\n'+'1 1\n'*n,lines([-7 if key=='range-sum' else 1]*n),'max-query-count')]
    if key=='range-add':return [test(row([n,n])+row([1,n,10**9])*n,lines([n*10**9]*n),k)]
    if key=='inversions':return [array_case(list(range(n,0,-1)),n*(n-1)//2,k),array_case([2]*n,0,'all-equal')]
    if key=='union-length':return [test(row([n])+''.join(row([i,i+2]) for i in range(n)),n+1,k),test('3\n0 10\n1 2\n3 4\n',10,'nested')]
    if key=='capacity':return [array_case([10**9]*n,n*10**9,k,(1,)),array_case([10**9]*n,10**9,'max-groups',(n,))]
    if key=='spacing':return [array_case([i*10000-10**9 for i in range(n)],(n-1)*10000,k,(2,)),array_case(list(range(n)),1,'all-stations',(n,))]
    if key=='short-window':return [array_case([1]*n,n,k,(n,)),array_case([1]*n,0,'no-window',(10**18,))]
    if key=='close-pairs':return [array_case([10**9]*n,n*(n-1)//2,k,(0,))]
    if key=='next-smaller':return [array_case(list(range(n)),lines([-1]*n),k),array_case([1]*n,lines([-1]*n),'equal-strict')]
    if key=='window-min':
        w=n//2;return [array_case(list(range(n)),lines(range(n-w+1)),k,(w,)),array_case([-10**9]*n,lines([-10**9]*n),'unit-window',(1,))]
    if key=='merge-cost':
        import heapq
        # Independent two-queue merge after sorting for the large equal-weight family.
        a=deque([10**9]*n);b=deque();ans=0
        def take():
            return a.popleft() if a and (not b or a[0]<=b[0]) else b.popleft()
        for _ in range(n-1):
            x=take()+take();ans+=x;b.append(x)
        return [array_case([10**9]*n,ans,k)]
    if key=='ordered-set':
        z=n//2;return [test(row([n])+''.join(row(['+',i]) for i in range(z))+row(['?',0])*z,lines([0]*z),k)]
    if key=='interval-choice':return [test(row([n])+''.join(row([i,i+1]) for i in range(n)),n,k)]
    if key=='subarray-target':return [array_case([0]*n,n*(n+1)//2,k,(0,)),array_case([1,-1]*(n//2),(n//2)**2,'signed-balance',(0,))]
    if key=='coins':return [test('100 100000\n'+row(range(1,101)),1000,k),test('2 99999\n2 4\n',-1,'unreachable-parity')]
    if key=='lis':return [array_case(list(range(n)),n,k),array_case([7]*n,1,'duplicates')]
    if key=='knapsack':return [test('100 100000\n'+'1000 1000000000\n'*100,100000000000,k),test('1 100000\n1 1\n',1,'no-reuse')]
    if key=='edit-distance':return [test('a'*3000+'\n'+'b'*3000+'\n',3000,k),test('a'*3000+'\n'+'a'*3000+'\n',0,'equal-long-strings')]
    if key in ('bfs','dag-longest','scc','dijkstra','mst','bridges','articulation'):
        edges=[(i,i+1) for i in range(n-1)]
        if key=='bfs':return [test(graph_input(n,edges,(1,)),lines(range(n)),k)]
        if key=='dag-longest':return [test(graph_input(n,edges),n-1,k),test('3 1\n3 3\n',-1,'disconnected-cycle')]
        if key=='scc':return [test(graph_input(n,edges),n,k),test(graph_input(n,edges+[(n-1,0)]),1,'long-cycle')]
        if key=='dijkstra':return [test(graph_input(n,[(u,v,10**9) for u,v in edges],(1,)),lines(i*10**9 for i in range(n)),k)]
        if key=='mst':return [test(graph_input(n,[(u,v,10**9) for u,v in edges]),(n-1)*10**9,k),test('3 1\n1 2 0\n','DISCONNECTED\n','disconnected')]
        return [test(graph_input(n,edges),n-1 if key=='bridges' else n-2,k),test('2 2\n1 2\n1 2\n',0,'parallel-edges')]
    if key=='bipartite':return [test(graph_input(n,[(i,i+1) for i in range(n-1)]),'YES\n',k),test('4 3\n2 3\n3 4\n4 2\n','NO\n','disconnected-odd-cycle')]
    if key=='floyd':
        n=400;e=[(i,j,1) for i in range(n) for j in range(n) if i!=j];q=200000
        return [test(graph_input(n,e,(q,))+row([1,n])*q,lines([1]*q),k),test('2 2 1\n1 2 1\n1 2 9\n1 2\n',1,'parallel-minimum')]
    if key=='connectivity':
        z=100000;ops=[('+',i,i+1) for i in range(1,z)]+[('?',1,z)]*(n-z+1)
        return [test(row([z,n])+''.join(row(x) for x in ops),lines(['YES']*(n-z+1)),k),test('4 4\n+ 1 2\n+ 3 4\n+ 1 3\n? 1 4\n','YES\n','nonroot-parent')]
    if key=='kmp':return [test('a'*250000+'\n'+'a'*500000+'\n',250001,k),test('a'*249999+'b\n'+'a'*500000+'\n',0,'long-partial-match')]
    if key=='period':return [test('a'*499999+'b\n',500000,k),test('ababa\n',5,'nonintegral-period')]
    if key=='weighted-intervals':return [test(row([n])+''.join(row([i,i+1,10**9]) for i in range(n)),n*10**9,k)]
    if key=='jump-score':return [array_case([-1]*n,-2,k,(n,)),array_case([10**9]*n,n*10**9,'overflow-all-positive',(n,))]
    if key=='fenwick':
        ops='';ans=[];rounds=q//2
        ops=(row(['+',1,10**9])+row(['?',1,n]))*rounds
        return [test(row([n,q])+row([0]*n)+ops,lines(i*10**9 for i in range(1,rounds+1)),k)]
    if key=='max-subarray':return [test(row([n,q])+row([1]*n)+row([1,-1])*q,lines([n-1]*q),k),test('3 1\n-1 -2 -3\n2 -4\n',0,'empty-optimum')]
    if key=='lazy-max':
        ops=(row(['+',1,n,-10**9])+row(['?',2,n-1]))*(q//2)
        return [test(row([n,q])+row([0]*n)+ops,lines(-i*10**9 for i in range(1,q//2+1)),k)]
    if key=='treap-order':
        z=100000;ops=''.join(row(['+',i]) for i in range(z))+row(['?',z])*z
        return [test(row([n])+ops,lines([z-1]*z),k),test('4\n+ 2\n+ 2\n- 2\n? 1\n',2,'delete-one-duplicate')]
    if key=='treap-sequence':
        ops=(row(['R',1,n])+row(['S',1,n//2]))*(q//2);ans=[]
        for i in range(q//2):ans.append(sum(range(n//2+1,n+1)) if i%2==0 else sum(range(1,n//2+1)))
        return [test(row([n,q])+row(range(1,n+1))+ops,lines(ans),k)]
    if key in ('tree-distance','tree-max'):
        e=''.join(row([i,i+1,-10**9]) for i in range(1,n));queries=row([1,n])*q
        ans=-(n-1)*10**9 if key=='tree-distance' else -10**9
        return [test(row([n,q])+e+queries,lines([ans]*q),k)]
    if key=='aho':
        ps=['a'*i for i in range(1,501)];return [test(row([len(ps)])+'\n'.join(ps)+'\n'+'a'*500000+'\n',lines(500001-i for i in range(1,501)),k),test('3\na\na\nba\nba\n','1\n1\n1\n','duplicates-suffixes')]
    if key=='sam':return [test('a'*n+'\n',n,k),test('a'*(n//2)+'b'*(n//2)+'\n',(n//2)**2+n,'large-count')]
    if key=='matching':
        n=20000;e=[(i,i) for i in range(n)]
        return [test(row([n,n,len(e)])+''.join(row([u+1,v+1]) for u,v in e),n,k),test('2 2 3\n1 1\n1 2\n2 1\n',2,'augmenting-path')]
    if key=='flow':
        n=500;e=[(0,i,10**9) for i in range(1,n-1)]+[(i,n-1,10**9) for i in range(1,n-1)]
        return [test(graph_input(n,e),(n-2)*10**9,k),test('2 3\n1 2 1000000000\n1 2 1000000000\n1 2 1000000000\n',3000000000,'parallel-overflow')]
    if key=='tsp':
        n=18;return [test(row([n])+''.join(row([0 if i==j else 10**9 for j in range(n)]) for i in range(n)),n*10**9,k)]
    if key=='domino':
        # Separate row-profile transfer, rather than recursive column transitions from C++.
        def count(height,width):
            dp={0:1};mod=1000000007
            for _ in range(height*width):
                nxt={};col=_%width
                for mask,val in dp.items():
                    if mask&1:states=[mask>>1]
                    else:
                        states=[(mask>>1)|(1<<(width-1))]
                        if col+1<width and not(mask&2):states.append((mask|2)>>1)
                    for s in states:nxt[s]=(nxt.get(s,0)+val)%mod
                dp=nxt
            return dp.get(0,0)
        return [test('10 1000\n',count(1000,10),k),test('9 999\n',0,'odd-area')]
    raise ValueError(key)

def cases_for(key):
    cases=[small(key,20260926+i) for i in range(48)]
    cases+=stress(key)
    seen=set();result=[]
    for c in cases:
        if c['input'] not in seen:result.append(c);seen.add(c['input'])
    assert len(result)<=100
    return result

# Keep the original course families intact; the expanded PDF topics have separate oracles.
from expanded_cases import KEYS as EXPANDED_KEYS, small as expanded_small, stress as expanded_stress

_original_small = small
_original_stress = stress


def small(key, seed):
    return expanded_small(key, seed) if key in EXPANDED_KEYS else _original_small(key, seed)


def stress(key):
    return expanded_stress(key) if key in EXPANDED_KEYS else _original_stress(key)

from foundation_cases import ORACLES as FOUNDATION_KEYS, cases_for as foundation_cases_for, small as foundation_small
_previous_cases_for = cases_for
_previous_small = small
def cases_for(key):
    return foundation_cases_for(key) if key in FOUNDATION_KEYS else _previous_cases_for(key)
def small(key,seed):
    return foundation_small(key,seed) if key in FOUNDATION_KEYS else _previous_small(key,seed)
