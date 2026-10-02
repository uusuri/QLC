#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;vector<vector<int>>g(n);for(int i=1;i<n;i++){int a,b;cin>>a>>b;g[a-1].push_back(b-1);g[b-1].push_back(a-1);}vector<int>p(n,-1),order={0},size(n);p[0]=0;for(int i=0;i<n;i++){int v=order[i];for(int u:g[v])if(p[u]<0){p[u]=v;order.push_back(u);}}for(int v=0;v<n;v++){int u=v;while(true){size[u]++;if(u==0)break;u=p[u];}}for(auto x:size)cout<<x<<' ';}
