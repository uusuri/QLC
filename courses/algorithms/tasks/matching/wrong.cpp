#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m,e;cin>>n>>m>>e;vector<vector<int>>g(n+1);while(e--){int u,v;cin>>u>>v;g[u].push_back(v);}vector<int>a(n+1),b(m+1),d(n+1),it(n+1);int ans=0,INF=n+m+1;
while(true){queue<int>q;fill(d.begin(),d.end(),INF);for(int u=1;u<=n;u++)if(!a[u]){d[u]=0;q.push(u);}int limit=INF;while(!q.empty()){int u=q.front();q.pop();if(d[u]>=limit)continue;for(int v:g[u]){if(!b[v])limit=d[u]+1;else if(d[b[v]]==INF){d[b[v]]=d[u]+1;q.push(b[v]);}}}if(limit==INF)break;fill(it.begin(),it.end(),0);function<bool(int)>dfs=[&](int u){for(int&i=it[u];i<(int)g[u].size();i++){int v=g[u][i];if((!b[v]&&d[u]+1==limit)||false){a[u]=v;b[v]=u;return true;}}d[u]=INF;return false;};for(int u=1;u<=n;u++)if(!a[u]&&dfs(u))ans++;}cout<<ans<<"\n";}
