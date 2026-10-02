#include <bits/stdc++.h>
using namespace std;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int a,b;cin>>a>>b;g[a-1].push_back(b-1);g[b-1].push_back(a-1);}int answer=0;for(int root=0;root<n;root++){vector<int>seen(n),queue={root};seen[root]=1;int smallest=root;for(int i=0;i<(int)queue.size();i++){int v=queue[i];smallest=min(smallest,v);for(int u:g[v])if(!seen[u]){seen[u]=1;queue.push_back(u);}}answer+=(root==smallest);}cout<<answer;}
