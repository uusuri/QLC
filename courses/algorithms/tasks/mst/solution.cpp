#include <bits/stdc++.h>
using namespace std;
using ll = long long;
struct DSU{vector<int>p,sz;DSU(int n):p(n),sz(n,1){iota(p.begin(),p.end(),0);}int find(int x){while(p[x]!=x){p[x]=p[p[x]];x=p[x];}return x;}bool join(int a,int b){a=find(a);b=find(b);if(a==b)return false;if(sz[a]<sz[b])swap(a,b);p[b]=a;sz[a]+=sz[b];return true;}};
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;cin>>n>>m;vector<tuple<ll,int,int>>e(m);for(auto&[w,u,v]:e)cin>>u>>v>>w;sort(e.begin(),e.end());DSU d(n+1);ll ans=0;int cnt=0;for(auto[w,u,v]:e)if(d.join(u,v)){ans+=w;cnt++;}if(cnt!=n-1)cout<<"DISCONNECTED\n";else cout<<ans<<"\n";}
