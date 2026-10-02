#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n,m;cin>>n>>m;const ll INF=1000000000000000LL;vector<vector<ll>>d(n,vector<ll>(n,INF));for(int i=0;i<n;i++)d[i][i]=0;while(m--){int u,v;ll w;cin>>u>>v>>w;--u;--v;d[u][v]=min(d[u][v],w);}for(int k=0;k<n;k++)for(int i=0;i<n;i++)for(int j=0;j<n;j++)if(d[i][k]<INF&&d[k][j]<INF)d[i][j]=max(-INF,min(d[i][j],d[i][k]+d[k][j]));bool bad=false;for(int i=0;i<n;i++)bad|=d[i][i]<0;cout<<(bad?"YES":"NO")<<'\n';}
