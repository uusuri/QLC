#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;cin>>n>>m;vector<vector<int>>g(n),r(n);while(m--){int u,v;cin>>u>>v;--u;--v;g[u].push_back(v);r[v].push_back(u);}vector<int>used(n),order;
for(int s=0;s<n;s++)if(!used[s]){vector<pair<int,int>>st{{s,0}};used[s]=1;while(!st.empty()){int u=st.back().first;int &i=st.back().second;if(i==(int)g[u].size()){order.push_back(u);st.pop_back();}else{int v=g[u][i++];if(!used[v]){used[v]=1;st.push_back({v,0});}}}}
fill(used.begin(),used.end(),0);reverse(order.begin(),order.end());int ans=0;for(int s:order)if(!used[s]){ans++;vector<int>st{s};used[s]=1;while(!st.empty()){int u=st.back();st.pop_back();for(int v:r[u])if(!used[v]){used[v]=1;st.push_back(v);}}}cout<<ans<<"\n";}
