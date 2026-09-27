#include <bits/stdc++.h>
using namespace std;
using ll = long long;
struct DSU{vector<int>p,sz;DSU(int n):p(n),sz(n,1){iota(p.begin(),p.end(),0);}int find(int x){while(p[x]!=x){p[x]=p[p[x]];x=p[x];}return x;}bool join(int a,int b){a=find(a);b=find(b);if(a==b)return false;if(sz[a]<sz[b])swap(a,b);p[b]=a;sz[a]+=sz[b];return true;}};
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;DSU d(n+1);while(q--){char c;int u,v;cin>>c>>u>>v;if(c=='+')d.join(u,v);else cout<<(d.find(u)==d.find(v)?"YES":"NO")<<"\n";}}
