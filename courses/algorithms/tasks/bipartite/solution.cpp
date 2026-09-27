#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int u,v;cin>>u>>v;--u;--v;g[u].push_back(v);g[v].push_back(u);}vector<int>c(n,-1);for(int s=0;s<n;s++)if(c[s]<0){queue<int>q;q.push(s);c[s]=0;while(!q.empty()){int u=q.front();q.pop();for(int v:g[u]){if(c[v]==c[u]){cout<<"NO\n";return 0;}if(c[v]<0){c[v]=c[u]^1;q.push(v);}}}}cout<<"YES\n";}
