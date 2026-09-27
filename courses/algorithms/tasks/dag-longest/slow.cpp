#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);vector<int>deg(n),d(n);vector<bool>done(n);while(m--){int u,v;cin>>u>>v;g[--u].push_back(--v);deg[v]++;}int ans=0;for(int step=0;step<n;step++){int u=-1;for(int i=0;i<n;i++)if(!done[i]&&deg[i]==0){u=i;break;}if(u<0){cout<<-1<<"\n";return 0;}done[u]=true;ans=max(ans,d[u]);for(int v:g[u]){deg[v]--;d[v]=max(d[v],d[u]+1);}}cout<<ans<<"\n";}
