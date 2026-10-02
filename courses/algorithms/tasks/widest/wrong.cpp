#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m,s,t;cin>>n>>m>>s>>t;--s;--t;vector<vector<pair<int,ll>>>g(n);while(m--){int u,v;ll w;cin>>u>>v>>w;g[--u].push_back({--v,w});g[v].push_back({u,w});}vector<ll>d(n,-1);priority_queue<pair<ll,int>>q;d[s]=LLONG_MAX;q.push({d[s],s});while(!q.empty()){auto[cur,u]=q.top();q.pop();if(cur!=d[u])continue;for(auto[v,w]:g[u]){ll x=w;if(x>d[v]){d[v]=x;q.push({x,v});}}}cout<<d[t]<<'\n';}
