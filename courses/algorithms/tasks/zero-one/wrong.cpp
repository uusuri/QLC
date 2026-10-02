#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m,s;cin>>n>>m>>s;--s;vector<vector<pair<int,int>>>g(n);while(m--){int u,v,w;cin>>u>>v>>w;g[--u].push_back({--v,w});}const int INF=1000000000;vector<int>d(n,INF);deque<pair<int,int>>q;d[s]=0;q.push_back({0,s});while(!q.empty()){auto [cur,u]=q.front();q.pop_front();if(cur!=d[u])continue;for(auto[v,w]:g[u])if(d[v]==INF){d[v]=cur+w;if(w)q.push_back({d[v],v});else q.push_front({d[v],v});}}for(int x:d)cout<<(x==INF?-1:x)<<'\n';}
