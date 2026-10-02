#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;cin>>n>>m;vector<tuple<int,int,ll>>e(m);for(auto &[u,v,w]:e){cin>>u>>v>>w;--u;--v;}vector<ll>d(n,1000000000000000LL);d[0]=0;bool changed=false;for(int i=0;i<n;i++){changed=false;for(auto[u,v,w]:e)if(d[u]<1000000000000000LL && d[v]>d[u]+w){d[v]=d[u]+w;changed=true;}if(!changed)break;}cout<<(changed?"YES":"NO")<<'\n';}
