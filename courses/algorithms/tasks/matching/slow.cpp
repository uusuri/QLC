#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int n,m,best=0;vector<vector<int>>g;vector<bool>used;void f(int u,int z){if(u==n){best=max(best,z);return;}f(u+1,z);for(int v:g[u])if(!used[v]){used[v]=true;f(u+1,z+1);used[v]=false;}}int main(){int e;cin>>n>>m>>e;g.resize(n);used.resize(m);while(e--){int u,v;cin>>u>>v;g[u-1].push_back(v-1);}f(0,0);cout<<best<<"\n";}
