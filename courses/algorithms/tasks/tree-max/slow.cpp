#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<vector<pair<int,ll>>>g(n);for(int i=1;i<n;i++){int u,v;ll w;cin>>u>>v>>w;--u;--v;g[u].push_back({v,w});g[v].push_back({u,w});}while(q--){int s,t;cin>>s>>t;--s;--t;vector<int>p(n,-1),o{s};vector<ll>d(n,LLONG_MIN);p[s]=s;for(size_t i=0;i<o.size();i++)for(auto[v,w]:g[o[i]])if(p[v]<0){p[v]=o[i];d[v]=max(d[o[i]],w);o.push_back(v);}cout<<(s==t?0:d[t])<<"\n";}}
