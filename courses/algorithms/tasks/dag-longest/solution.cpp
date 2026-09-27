#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;cin>>n>>m;vector<vector<int>>g(n);vector<int>deg(n),d(n);while(m--){int u,v;cin>>u>>v;g[--u].push_back(--v);deg[v]++;}queue<int>q;for(int i=0;i<n;i++)if(!deg[i])q.push(i);int seen=0,ans=0;while(!q.empty()){int u=q.front();q.pop();seen++;ans=max(ans,d[u]);for(int v:g[u]){d[v]=max(d[v],d[u]+1);if(--deg[v]==0)q.push(v);}}cout<<(seen==n?ans:-1)<<"\n";}
