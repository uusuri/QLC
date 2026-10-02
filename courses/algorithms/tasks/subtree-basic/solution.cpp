#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;vector<vector<int>>g(n);for(int i=1;i<n;i++){int a,b;cin>>a>>b;--a;--b;g[a].push_back(b);g[b].push_back(a);}vector<int>parent(n,-1),order={0},size(n,1);parent[0]=0;for(int i=0;i<n;i++){int v=order[i];for(int u:g[v])if(parent[u]<0){parent[u]=v;order.push_back(u);}}for(int i=n-1;i>0;i--){int v=order[i];size[parent[v]]+=size[v];}for(int x:size)cout<<x<<' ';}
