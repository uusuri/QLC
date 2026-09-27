#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int u,v;cin>>u>>v;--u;--v;g[u].push_back(v);g[v].push_back(u);}auto count=[&](int skip){vector<bool>s(n);int z=0;for(int i=0;i<n;i++)if(i!=skip&&!s[i]){z++;vector<int>q{i};s[i]=true;for(size_t j=0;j<q.size();j++)for(int v:g[q[j]])if(v!=skip&&!s[v]){s[v]=true;q.push_back(v);}}return z;};int b=count(-1),z=0;for(int i=0;i<n;i++)z+=count(i)>b;cout<<z<<"\n";}
