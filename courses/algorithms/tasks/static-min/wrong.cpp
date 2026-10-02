#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;int K=bit_width((unsigned)n);vector<vector<ll>>s(K,vector<ll>(n));for(ll &x:s[0])cin>>x;for(int k=1;k<K;k++)for(int i=0;i+(1<<k)<=n;i++)s[k][i]=min(s[k-1][i],s[k-1][i+(1<<(k-1))]);while(q--){int l,r;cin>>l>>r;--l;int k=bit_width((unsigned)(r-l))-1;cout<<min(s[k][l],s[k][l])<<'\n';}}
