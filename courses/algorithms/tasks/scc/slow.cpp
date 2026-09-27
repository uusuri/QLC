#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int u,v;cin>>u>>v;g[--u].push_back(--v);}vector<vector<bool>>r(n,vector<bool>(n));for(int s=0;s<n;s++){vector<int>q{s};r[s][s]=true;for(size_t i=0;i<q.size();i++)for(int v:g[q[i]])if(!r[s][v]){r[s][v]=true;q.push_back(v);}}int z=0;for(int i=0;i<n;i++){bool first=true;for(int j=0;j<i;j++)if(r[i][j]&&r[j][i])first=false;z+=first;}cout<<z<<"\n";}
