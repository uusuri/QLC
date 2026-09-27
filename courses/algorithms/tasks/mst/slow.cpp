#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m;cin>>n>>m;vector<vector<pair<int,ll>>>g(n);while(m--){int u,v;ll w;cin>>u>>v>>w;--u;--v;g[u].push_back({v,w});g[v].push_back({u,w});}vector<ll>d(n,LLONG_MAX);vector<bool>used(n);d[0]=0;ll ans=0;for(int i=0;i<n;i++){int u=-1;for(int j=0;j<n;j++)if(!used[j]&&(u<0||d[j]<d[u]))u=j;if(d[u]==LLONG_MAX){cout<<"DISCONNECTED\n";return 0;}used[u]=true;ans+=d[u];for(auto[v,w]:g[u])if(!used[v])d[v]=min(d[v],w);}cout<<ans<<"\n";}
