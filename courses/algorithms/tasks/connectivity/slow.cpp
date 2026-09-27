#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<vector<int>>g(n+1);while(q--){char c;int u,v;cin>>c>>u>>v;if(c=='+'){g[u].push_back(v);g[v].push_back(u);}else{vector<bool>seen(n+1);vector<int>s{u};seen[u]=true;for(size_t i=0;i<s.size();i++)for(int w:g[s[i]])if(!seen[w]){seen[w]=true;s.push_back(w);}cout<<(seen[v]?"YES":"NO")<<"\n";}}}
