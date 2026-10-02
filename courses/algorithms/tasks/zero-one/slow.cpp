#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n,m,s;cin>>n>>m>>s;vector<tuple<int,int,int>>e(m);for(auto&[u,v,w]:e){cin>>u>>v>>w;--u;--v;}vector<int>d(n,1000000000);d[s-1]=0;for(int i=1;i<n;i++){bool change=false;for(auto[u,v,w]:e)if(d[u]<1000000000&&d[v]>d[u]+w){d[v]=d[u]+w;change=true;}if(!change)break;}for(int x:d)cout<<(x==1000000000?-1:x)<<'\n';}
