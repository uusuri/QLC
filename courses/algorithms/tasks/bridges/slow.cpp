#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m;cin>>n>>m;vector<pair<int,int>>e(m);for(auto&[u,v]:e){cin>>u>>v;--u;--v;}auto count=[&](int skip){vector<vector<int>>g(n);for(int i=0;i<m;i++)if(i!=skip){auto[u,v]=e[i];g[u].push_back(v);g[v].push_back(u);}vector<bool>seen(n);int z=0;for(int s=0;s<n;s++)if(!seen[s]){z++;vector<int>q{s};seen[s]=true;for(size_t i=0;i<q.size();i++)for(int v:g[q[i]])if(!seen[v]){seen[v]=true;q.push_back(v);}}return z;};int base=count(-1),ans=0;for(int i=0;i<m;i++)ans+=count(i)>base;cout<<ans<<"\n";}
