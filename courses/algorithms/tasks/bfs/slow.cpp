#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m,s;cin>>n>>m>>s;vector<pair<int,int>>e(m);for(auto&[u,v]:e)cin>>u>>v;vector<int>d(n+1,1000000000);d[s]=0;for(int i=1;i<n;i++)for(auto[u,v]:e){d[v]=min(d[v],d[u]+1);d[u]=min(d[u],d[v]+1);}for(int i=1;i<=n;i++)cout<<(d[i]==1000000000?-1:d[i])<<"\n";}
