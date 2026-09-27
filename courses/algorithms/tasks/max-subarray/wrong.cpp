#include <bits/stdc++.h>
using namespace std;
using ll = long long;
struct N{ll s=0,p=0,q=0,b=0;};N join(N a,N b){return {a.s+b.s,max(a.p,a.s+b.p),max(b.q,b.s+a.q),max({a.b,b.b,a.p+b.q})};}N leaf(ll x){return {x,max(0LL,x),max(0LL,x),max(0LL,x)};}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;int z=1;while(z<n)z*=2;vector<N>t(2*z);for(int i=0;i<n;i++){ll x;cin>>x;t[z+i]=leaf(x);}for(int i=z-1;i;i--)t[i]=join(t[2*i],t[2*i+1]);while(q--){int p;ll x;cin>>p>>x;p=z+p-1;t[p]=leaf(x);for(p/=2;p;p/=2)t[p]=join(t[2*p],t[2*p+1]);cout<<t[1].b<<"\n";}}
