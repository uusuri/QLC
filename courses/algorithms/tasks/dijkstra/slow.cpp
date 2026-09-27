#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m,s;cin>>n>>m>>s;vector<tuple<int,int,ll>>e(m);for(auto&[u,v,w]:e)cin>>u>>v>>w;const ll I=4000000000000000000LL;vector<ll>d(n+1,I);d[s]=0;for(int i=1;i<n;i++)for(auto[u,v,w]:e)if(d[u]!=I)d[v]=min(d[v],d[u]+w);for(int i=1;i<=n;i++)cout<<(d[i]==I?-1:d[i])<<"\n";}
