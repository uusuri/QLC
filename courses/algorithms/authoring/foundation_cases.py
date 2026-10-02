"""Independent small oracles and adversarial families for foundational tasks."""
import random
def lines(a):return ' '.join(map(str,a))+'\n'

def tree_input(parent,queries=None):
 n=len(parent);s=str(n)+((' '+str(len(queries))) if queries is not None else '')+'\n'+''.join(f'{parent[v]+1} {v+1}\n' for v in range(1,n))
 if queries is not None:s+=''.join(lines(q) for q in queries)
 return s

def ancestor(parent,v,k):
 while k and v!=0:v=parent[v];k-=1
 return -1 if k else v+1

def tree_length(parent,a,b):
 ancestors={};length=0
 while True:
  ancestors[a]=length
  if a==0:break
  a=parent[a];length+=1
 length=0
 while b not in ancestors:b=parent[b];length+=1
 return length+ancestors[b]

def sub_sizes(parent):
 out=[1]*len(parent)
 for v in range(len(parent)-1,0,-1):out[parent[v]]+=out[v]
 return out

def bracket_oracle(s):
 stack=[];pairs={')':'(',']':'[','}':'{'}
 for c in s.strip():
  if c in '([{':stack.append(c)
  elif not stack or stack.pop()!=pairs[c]:return '0\n'
 return ('0' if stack else '1')+'\n'

def queue_oracle(s):
 from collections import deque
 a=deque();out=[]
 for line in s.splitlines()[1:]:
  if line.startswith('+'):a.append(int(line.split()[1]))
  else:out.append(a.popleft())
 return ''.join(str(x)+'\n' for x in out)

def boundary_oracle(s):
 v=list(map(int,s.split()));n,q=v[:2];a=v[2:2+n];out=[]
 for x in v[2+n:]:out.append(next((i for i,y in enumerate(a) if y>=x),n))
 return ''.join(str(x)+'\n' for x in out)

def parse_tree(s,with_q=True):
 v=list(map(int,s.split()));n=v[0];q=v[1] if with_q else 0;offset=2 if with_q else 1;g=[[]for _ in range(n)]
 for i in range(n-1):a,b=v[offset+2*i:offset+2*i+2];g[a-1].append(b-1);g[b-1].append(a-1)
 parent=[-1]*n;parent[0]=0;queue=[0]
 for a in queue:
  for b in g[a]:
   if parent[b]<0:parent[b]=a;queue.append(b)
 return n,q,parent,v[offset+2*(n-1):],g

def tree_oracle(s,mode):
 n,q,p,v,g=parse_tree(s);out=[]
 for i in range(q):
  a,b=v[2*i:2*i+2]
  if mode=='ancestor':out.append(ancestor(p,a-1,b))
  else:out.append(tree_length(p,a-1,b-1))
 return ''.join(str(x)+'\n' for x in out)

def subtree_oracle(s):
 n,q,p,v,g=parse_tree(s,False);out=[]
 for root in range(n):
  count=0
  for child in range(n):
   a=child
   while a!=root and a!=0:a=p[a]
   if a==root:count+=1
  out.append(count)
 return lines(out)

def prefix_oracle(s):
 s=s.strip();return lines([max([k for k in range(i+1) if s[:k]==s[i-k+1:i+1]]) for i in range(len(s))])

def z_oracle(s):
 s=s.strip();out=[0]
 for i in range(1,len(s)):
  j=0
  while i+j<len(s) and s[j]==s[i+j]:j+=1
  out.append(j)
 return lines(out)

def point_oracle(s):
 parts=s.splitlines();n,q=map(int,parts[0].split());a=list(map(int,parts[1].split()));out=[]
 for line in parts[2:]:
  c,p,x=line.split();p=int(p);x=int(x)
  if c=='=':a[p]=x
  else:out.append(sum(a[p:x]))
 return ''.join(str(x)+'\n' for x in out)

def bst_oracle(s):
 present=set();out=[]
 for line in s.splitlines()[1:]:
  c,x=line.split();x=int(x)
  if c=='+':present.add(x)
  elif c=='-':present.discard(x)
  else:out.append(int(x in present))
 return ''.join(str(x)+'\n' for x in out)

def components_oracle(s):
 v=list(map(int,s.split()));n,m=v[:2];adj=[[False]*n for _ in range(n)]
 for a,b in zip(v[2::2],v[3::2]):adj[a-1][b-1]=adj[b-1][a-1]=True
 for i in range(n):adj[i][i]=True
 for k in range(n):
  for i in range(n):
   if adj[i][k]:
    for j in range(n):adj[i][j]|=adj[k][j]
 unseen=set(range(n));count=0
 while unseen:
  a=next(iter(unseen));unseen-={i for i in range(n) if adj[a][i]};count+=1
 return str(count)+'\n'

def dag_oracle(s):
 v=list(map(int,s.split()));n,m=v[:2];adj=[[False]*n for _ in range(n)]
 for a,b in zip(v[2::2],v[3::2]):adj[a-1][b-1]=True
 for k in range(n):
  for i in range(n):
   if adj[i][k]:
    for j in range(n):adj[i][j]|=adj[k][j]
 return str(int(not any(adj[i][i] for i in range(n))))+'\n'

def small_input(key,seed):
 r=random.Random(seed);n=r.randint(1,14)
 if key=='brackets-basic':
  if seed%3==0:
   pairs=[r.choice(['()','[]','{}']) for _ in range(n)];return ''.join(p[0] for p in pairs)+''.join(p[1] for p in pairs[::-1])+'\n'
  return ''.join(r.choice('()[]{}') for _ in range(n))+'\n'
 if key in ('prefix-basic','z-basic'):return ''.join(r.choice('abc') for _ in range(n*2))+'\n'
 if key in ('sort-basic','heap-basic','boundary-basic'):
  a=[r.randint(-4,4) for _ in range(n)]
  if key=='sort-basic':return str(n)+'\n'+lines(a)
  if key=='heap-basic':return f'{n} {r.randint(1,n)}\n'+lines(a)
  a.sort();queries=[r.randint(-5,5) for _ in range(n)];return f'{n} {n}\n'+lines(a)+''.join(str(x)+'\n'for x in queries)
 if key=='queue-basic':
  ops=[];size=0
  for _ in range(30):
   if size>0 and r.randrange(2):ops.append('-');size-=1
   else:ops.append('+ '+str(r.randint(-9,9)));size+=1
  return str(len(ops))+'\n'+'\n'.join(ops)+'\n'
 if key=='bst-basic':
  ops=['+ 3','+ 3','- 3','? 3']+[r.choice('+-?')+' '+str(r.randint(-5,5))for _ in range(30)]
  return str(len(ops))+'\n'+'\n'.join(ops)+'\n'
 if key in ('kth-ancestor-basic','tree-length-basic','subtree-basic'):
  p=[0]+[r.randrange(v)for v in range(1,n)]
  if key=='subtree-basic':return tree_input(p)
  queries=[(r.randint(1,n),r.choice([0,1,n,10**18,r.randint(0,n)])) if key=='kth-ancestor-basic' else (r.randint(1,n),r.randint(1,n))for _ in range(30)]
  return tree_input(p,queries)
 if key=='point-range-basic':
  a=[r.randint(-9,9)for _ in range(n)];ops=[]
  for _ in range(30):
   if r.randrange(2):ops.append('= '+str(r.randrange(n))+' '+str(r.randint(-9,9)))
   else:
    left=r.randrange(n);ops.append('? '+str(left)+' '+str(r.randint(left+1,n)))
  return f'{n} {len(ops)}\n'+lines(a)+'\n'.join(ops)+'\n'
 if key in ('components-basic','dag-basic'):
  edges=[(r.randint(1,n),r.randint(1,n)) for _ in range(r.randint(0,25))]
  return f'{n} {len(edges)}\n'+''.join(lines(e)for e in edges)
 raise KeyError(key)

def max_cases(key):
 n=200000;q=200000;k='max-size-adversarial'
 if key=='brackets-basic':return [('('*500000+')'*500000+'\n','1\n',k),('([)]\n','0\n','wrong-nesting')]
 if key=='prefix-basic':return [('a'*1000000+'\n',lines(range(1000000)),k),('abababacabababa\n',prefix_oracle('abababacabababa'),'fallback')]
 if key=='z-basic':return [('a'*1000000+'\n',lines([0,*range(999999,0,-1)]),k),('aabcaabxaaaz\n',z_oracle('aabcaabxaaaz'),'block-boundary')]
 if key=='sort-basic':return [(str(n)+'\n'+lines(range(n,0,-1)),lines(range(1,n+1)),k)]
 if key=='heap-basic':return [(f'{n} {n}\n'+lines([7]*n),lines([7]*n),k)]
 if key=='boundary-basic':return [(f'{n} {q}\n'+lines([0]*n)+'1\n'*q,(str(n)+'\n')*q,k)]
 if key=='queue-basic':return [(str(q)+'\n'+''.join('+ '+str(x)+'\n' for x in range(q//2))+'-\n'*(q//2),''.join(str(x)+'\n'for x in range(q//2)),k)]
 if key=='bst-basic':return [(str(q)+'\n'+''.join('+ '+str(x)+'\n'for x in range(q//2))+''.join('? '+str(x)+'\n'for x in range(q//2)),'1\n'*(q//2),k)]
 if key=='kth-ancestor-basic':return [(tree_input([0,*range(n-1)],[(n,n-1)]*q),'1\n'*q,k)]
 if key=='tree-length-basic':return [(tree_input([0,*range(n-1)],[(1,n)]*q),(str(n-1)+'\n')*q,k), (tree_input([0]*n,[(2,3)]*q),'2\n'*q,'max-star')]
 if key=='subtree-basic':return [(tree_input([0,*range(n-1)]),lines(range(n,0,-1)),k)]
 if key=='point-range-basic':return [(f'{n} {q}\n'+lines([10**9]*n)+f'? 0 {n}\n'*q,(str(n*10**9)+'\n')*q,k)]
 if key=='components-basic':return [(f'{n} {n-1}\n'+''.join(f'{v} {v+1}\n'for v in range(1,n)),'1\n',k),(f'{n} 0\n',str(n)+'\n','max-isolated')]
 if key=='dag-basic':return [(f'{n} {n-1}\n'+''.join(f'{v} {v+1}\n'for v in range(1,n)),'1\n',k),(f'{n} {n}\n'+''.join(f'{v} {v+1}\n'for v in range(1,n))+f'{n} 1\n','0\n','max-cycle')]
 raise KeyError(key)

ORACLES={'brackets-basic': 'bracket_oracle', 'queue-basic': 'queue_oracle', 'sort-basic': 'sort_oracle', 'boundary-basic': 'boundary_oracle', 'heap-basic': 'heap_oracle', 'kth-ancestor-basic': 'ancestor_oracle', 'tree-length-basic': 'length_oracle', 'subtree-basic': 'subtree_oracle', 'prefix-basic': 'prefix_oracle', 'z-basic': 'z_oracle', 'point-range-basic': 'point_oracle', 'bst-basic': 'bst_oracle', 'components-basic': 'components_oracle', 'dag-basic': 'dag_oracle'}
def sort_oracle(s): return lines(sorted(list(map(int,s.split()))[1:]))
def heap_oracle(s): return lines(sorted(list(map(int,s.split()))[2:])[:int(s.split()[1])])
def ancestor_oracle(s): return tree_oracle(s,'ancestor')
def length_oracle(s): return tree_oracle(s,'length')
def small(key,seed):
    s=small_input(key,seed)
    return dict(input=s,output=globals()[ORACLES[key]](s),kind='oracle-seed-'+str(seed))
def cases_for(key):
    result=[dict(small(key,20260929+i),kind='oracle-seed-'+str(i)) for i in range(40)]
    result += [dict(input=s,output=o,kind=k) for s,o,k in max_cases(key)]
    return result
