#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n,m,s,t;cin>>n>>m>>s>>t;--s;--t;vector<vector<pair<int,ll>>>g(n);vector<ll>ws;while(m--){int u,v;ll w;cin>>u>>v>>w;--u;--v;g[u].push_back({v,w});g[v].push_back({u,w});ws.push_back(w);}sort(ws.rbegin(),ws.rend());ws.erase(unique(ws.begin(),ws.end()),ws.end());ll ans=-1;for(ll x:ws){vector<bool>seen(n);queue<int>q;q.push(s);seen[s]=true;while(!q.empty()){int u=q.front();q.pop();for(auto[v,w]:g[u])if(w>=x&&!seen[v]){seen[v]=true;q.push(v);}}if(seen[t]){ans=x;break;}}cout<<ans<<'\n';}
