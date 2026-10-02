#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;cin>>n>>q;vector<vector<int>>g(n);for(int i=1;i<n;i++){int a,b;cin>>a>>b;--a;--b;g[a].push_back(b);g[b].push_back(a);}int levels=1;while((1LL<<levels)<=n)levels++;vector<vector<int>>up(levels,vector<int>(n));vector<int>d(n,-1),order={0};d[0]=0;for(int i=0;i<n;i++){int v=order[i];for(int u:g[v])if(d[u]<0){d[u]=d[v]+1;up[0][u]=v;order.push_back(u);}}for(int j=1;j<levels;j++)for(int v=0;v<n;v++)up[j][v]=up[j-1][up[j-1][v]];while(q--){int a,b;cin>>a>>b;--a;--b;cout<<abs(d[a]-d[b])<<'\n';}}
