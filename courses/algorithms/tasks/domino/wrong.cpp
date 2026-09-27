#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m;cin>>n>>m;const ll MOD=1000000007;int M=1<<n;vector<vector<int>>next(M);for(int mask=0;mask<M;mask++){function<void(int,int)>go=[&](int r,int out){if(r==n){next[mask].push_back(out);return;}if(mask>>r&1){go(r+1,out);return;}go(r+1,out|1<<r);if(r+1<n&&!(mask>>(r+1)&1))go(r+2,out);};go(0,0);}vector<ll>d(M),e(M);d[0]=1;for(int col=0;col<m;col++){fill(e.begin(),e.end(),0);for(int mask=0;mask<M;mask++)for(int out:next[mask])e[out]=(e[out]+d[mask])%MOD;swap(d,e);}cout<<accumulate(d.begin(),d.end(),0LL)%MOD<<"\n";}
