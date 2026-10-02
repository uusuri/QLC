"""PDF expansion: definition-based small oracles and adversarial maximum inputs."""
import itertools
import math
import random

KEYS = ('postfix', 'rectangle-sum', 'static-min', 'zero-one', 'widest',
        'negative-cycle', 'forced-mst', 'divisor-count', 'mod-power',
        'prime-queries', 'lca-query', 'kth-subarray')


def row(xs):
    return ' '.join(map(str, xs)) + '\n'


def case(inp, out, kind):
    return {'input': inp, 'output': str(out) + '\n', 'kind': kind}


def answers(xs):
    return ''.join(str(x) + '\n' for x in xs).rstrip('\n')


def graph(n, edges, *extra):
    return row([n, len(edges), *extra]) + ''.join(row(e) for e in edges)


def small(key, seed):
    rng = random.Random(seed)
    kind = f'oracle-seed-{seed}'
    if key == 'postfix':
        def expression(depth):
            if depth == 0 or rng.randrange(3) == 0:
                value = rng.randint(-5, 5)
                return [str(value)], value
            a, av = expression(depth-1); b, bv = expression(depth-1)
            op = rng.choice('+-*')
            value = av+bv if op == '+' else av-bv if op == '-' else av*bv
            return a+b+[op], value
        tokens, value = expression(4)
        return case(row([len(tokens)])+row(tokens), value, kind)
    if key == 'rectangle-sum':
        h, w = rng.randint(1, 6), rng.randint(1, 6)
        a = [[rng.randint(-10, 10) for _ in range(w)] for _ in range(h)]
        qs = []; out = []
        for _ in range(20):
            y1, y2 = sorted([rng.randint(1, h), rng.randint(1, h)])
            x1, x2 = sorted([rng.randint(1, w), rng.randint(1, w)])
            qs.append((y1, x1, y2, x2))
            out.append(sum(a[y][x] for y in range(y1-1, y2) for x in range(x1-1, x2)))
        return case(row([h,w,len(qs)])+''.join(row(r) for r in a)+''.join(row(q) for q in qs), answers(out), kind)
    if key in ('static-min', 'kth-subarray'):
        n = rng.randint(1, 25); a = [rng.randint(-20,20) for _ in range(n)]
        qs=[]; out=[]
        for _ in range(20):
            l,r=sorted([rng.randint(1,n),rng.randint(1,n)])
            if key == 'static-min': qs.append((l,r)); out.append(min(a[l-1:r]))
            else:
                k=rng.randint(1,r-l+1); qs.append((l,r,k)); out.append(sorted(a[l-1:r])[k-1])
        return case(row([n,len(qs)])+row(a)+''.join(row(q) for q in qs), answers(out), kind)
    if key in ('zero-one','widest','negative-cycle'):
        n=rng.randint(2,8); m=rng.randint(0,15)
        edges=[(rng.randint(1,n),rng.randint(1,n),rng.randint(0,1) if key=='zero-one' else rng.randint(-5,5) if key=='negative-cycle' else rng.randint(0,20)) for _ in range(m)]
        if key == 'zero-one':
            s=rng.randint(1,n); d=[math.inf]*n;d[s-1]=0
            # Synchronous Bellman, independent of the deque implementation.
            for _ in range(n-1):
                old=d[:]
                for u,v,w in edges:d[v-1]=min(d[v-1],old[u-1]+w)
            return case(graph(n,edges,s),answers(-1 if math.isinf(x) else x for x in d),kind)
        if key == 'negative-cycle':
            d=[[math.inf]*n for _ in range(n)]
            for i in range(n):d[i][i]=0
            for u,v,w in edges:d[u-1][v-1]=min(d[u-1][v-1],w)
            for k in range(n):
                for i in range(n):
                    for j in range(n):d[i][j]=min(d[i][j],d[i][k]+d[k][j])
            return case(graph(n,edges),'YES' if any(d[i][i]<0 for i in range(n)) else 'NO',kind)
        s,t=rng.sample(range(1,n+1),2); g=[[] for _ in range(n+1)]
        for u,v,w in edges:g[u].append((v,w));g[v].append((u,w))
        best=-1
        def dfs(u,visited,width):
            nonlocal best
            if u==t:best=max(best,width);return
            for v,w in g[u]:
                if v not in visited:dfs(v,visited|{v},min(width,w))
        dfs(s,{s},math.inf)
        return case(graph(n,edges,s,t),best,kind)
    if key == 'divisor-count':
        n=rng.randint(1,500)
        return case(row([n]),sum(n%d==0 for d in range(1,n+1)),kind)
    if key == 'mod-power':
        a,b,m=rng.randint(0,10**6),rng.randint(0,20),rng.randint(1,10**6)
        # Repeated multiplication, rather than binary exponentiation.
        value=1%m
        for _ in range(b):value=value*a%m
        return case(row([a,b,m]),value,kind)
    if key == 'prime-queries':
        n=rng.randint(1,150); qs=[];out=[]
        def prime(x):return x>=2 and all(x%d for d in range(2,math.isqrt(x)+1))
        for _ in range(20):
            l,r=sorted([rng.randint(1,n),rng.randint(1,n)])
            qs.append((l,r));out.append(sum(prime(x) for x in range(l,r+1)))
        return case(row([n,len(qs)])+''.join(row(q) for q in qs),answers(out),kind)
    if key == 'lca-query':
        n=rng.randint(1,30); parent=[0,1]+[rng.randint(1,v-1) for v in range(2,n+1)]
        edges=[(parent[v],v) for v in range(2,n+1)];qs=[];out=[]
        for _ in range(20):
            u,v=rng.randint(1,n),rng.randint(1,n);qs.append((u,v));anc=set()
            while True:
                anc.add(u)
                if u==1:break
                u=parent[u]
            while v not in anc:v=parent[v]
            out.append(v)
        return case(row([n,len(qs)])+''.join(row(e) for e in edges)+''.join(row(q) for q in qs),answers(out),kind)
    if key == 'forced-mst':
        n=rng.randint(2,6); edges=[(rng.randint(1,v-1),v,rng.randint(-8,8)) for v in range(2,n+1)]
        edges += [(*rng.sample(range(1,n+1),2),rng.randint(-8,8)) for _ in range(rng.randint(0,5))]
        best=[math.inf]*len(edges)
        # Enumerate every candidate spanning tree, not Kruskal or path maxima.
        for chosen in itertools.combinations(range(len(edges)),n-1):
            g=[[] for _ in range(n+1)];cost=0
            for i in chosen:
                u,v,w=edges[i];g[u].append(v);g[v].append(u);cost+=w
            seen={1};stack=[1]
            while stack:
                for v in g[stack.pop()]:
                    if v not in seen:seen.add(v);stack.append(v)
            if len(seen)==n:
                for i in chosen:best[i]=min(best[i],cost)
        qs=list(range(1,len(edges)+1))
        return case(graph(n,edges,len(qs))+''.join(row([x]) for x in qs),answers(best),kind)
    raise ValueError(key)


def stress(key):
    kind='max-size-adversarial'; n=200000; q=50000
    if key == 'postfix':
        # Deep stack followed by reductions: front erasure/collapsing is quadratic.
        z=100001; tokens=['1']*z+['+']*(z-1)
        return [case(row([len(tokens)])+row(tokens),z,kind),case('3\n8 3 -\n',5,'operand-order')]
    if key == 'rectangle-sum':
        h=w=1000;q=50000;a=row([10**9]*w)*h
        return [case(row([h,w,q])+a+row([1,1,h,w])*q,answers([h*w*10**9]*q),kind),case('2 2 1\n1 2\n3 4\n2 2 2 2\n',4,'overlap-sign')]
    if key == 'static-min':
        a=list(range(n,0,-1))
        return [case(row([n,q])+row(a)+row([1,n])*q,answers([1]*q),kind),case('4 2\n8 7 6 -5\n1 4\n4 4\n','-5\n-5','right-block-and-unit')]
    if key == 'zero-one':
        edges=[(i,i+1,0) for i in range(n-1,0,-1)]
        return [case(graph(n,edges,1),answers([0]*n),kind),case('3 3 1\n1 2 1\n1 3 0\n3 2 0\n','0\n0\n0','late-zero-improvement')]
    if key == 'widest':
        edges=[(i,i+1,n-i) for i in range(1,n)]
        return [case(graph(n,edges,1,n),1,kind),case('3 2 1 3\n1 2 2\n2 3 9\n',2,'bottleneck-not-final-edge'),case('2 1 1 2\n1 2 0\n',0,'zero-capacity')]
    if key == 'negative-cycle':
        n=2000;edges=[(i,i+1,0) for i in range(1,n)]
        return [case(graph(n,edges),'NO',kind),case('3 1\n3 3 -1\n','YES','unreachable-negative-cycle')]
    if key == 'divisor-count':
        return [case('1000000000000\n',169,kind),case('1\n',1,'unit'),case('9999999967\n',2,'large-prime')]
    if key == 'mod-power':
        a,b,m=10**18-7,10**18,10**18-3
        return [case(row([a,b,m]),pow(a,b,m),kind),case('17 0 1\n',0,'zero-exponent-mod-one'),case('0 100 7\n',0,'zero-base')]
    if key == 'prime-queries':
        n=2000000;q=200000
        # Linear sieve, independent of the reference's classical multiples sieve.
        lp=[0]*(n+1);primes=[]
        for i in range(2,n+1):
            if lp[i]==0:lp[i]=i;primes.append(i)
            for p in primes:
                if p>lp[i] or i*p>n:break
                lp[i*p]=p
        return [case(row([n,q])+row([1,n])*q,answers([len(primes)]*q),kind),case('1 1\n1 1\n',0,'one-is-not-prime')]
    if key == 'lca-query':
        edges=''.join(row([i,i+1]) for i in range(1,n))
        return [case(row([n,q])+edges+row([1,n])*q,answers([1]*q),kind),case('3 2\n1 2\n2 3\n2 3\n3 3\n','2\n3','ancestor-and-equal')]
    if key == 'kth-subarray':
        a=list(range(n,0,-1));qs=[(1,n,1+i%(n)) for i in range(q)]
        return [case(row([n,q])+row(a)+''.join(row(x) for x in qs),answers(x[2] for x in qs),kind),case('3 3\n1 4 1\n1 1 1\n1 3 2\n2 2 1\n','1\n1\n4','duplicates-and-left-prefix')]
    if key == 'forced-mst':
        n=100000;edges=[(i,i+1,-1) for i in range(1,n)]+[(1,n,0)]
        q=50000
        return [case(graph(n,edges,q)+row([len(edges)])*q,answers([-(n-2)]*q),kind),case('2 2 2\n1 2 -8\n1 2 -3\n1\n2\n','-8\n-3','negative-path-and-parallel')]
    raise ValueError(key)
