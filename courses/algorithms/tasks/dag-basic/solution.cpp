#include <bits/stdc++.h>
using namespace std;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);vector<int>d(n);while(m--){int a,b;cin>>a>>b;--a;--b;g[a].push_back(b);d[b]++;}queue<int>q;for(int v=0;v<n;v++)if(!d[v])q.push(v);int count=0;while(!q.empty()){int v=q.front();q.pop();count++;for(int u:g[v])if(--d[u]==0)q.push(u);}cout<<(count==n);}
