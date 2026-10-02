#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n,q;cin>>n>>q;vector<vector<int>>g(n);for(int i=1;i<n;i++){int u,v;cin>>u>>v;--u;--v;g[u].push_back(v);g[v].push_back(u);}vector<int>p(n,-1),d(n),ord{0};p[0]=0;for(size_t i=0;i<ord.size();i++){int v=ord[i];for(int u:g[v])if(u!=p[v]){p[u]=v;d[u]=d[v]+1;ord.push_back(u);}}while(q--){int u,v;cin>>u>>v;--u;--v;while(d[u]>d[v])u=p[u];while(d[v]>d[u])v=p[v];while(u!=v){u=p[u];v=p[v];}cout<<u+1<<'\n';}}
