#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<vector<ll>>c(n,vector<ll>(n));for(auto&r:c)for(auto&x:r)cin>>x;const ll I=4000000000000000000LL;int M=1<<n;vector<ll>d((size_t)M*n,I);d[n]=0;for(int mask=1;mask<M;mask+=2)for(int v=0;v<n;v++)if(d[(size_t)mask*n+v]!=I)for(int u=0;u<n;u++)if(!(mask>>u&1)){auto&z=d[(size_t)(mask|1<<u)*n+u];z=min(z,d[(size_t)mask*n+v]+c[v][u]);}ll ans=I;for(int v=0;v<n;v++)ans=min(ans,d[(size_t)(M-1)*n+v]+0);cout<<ans<<"\n";}
