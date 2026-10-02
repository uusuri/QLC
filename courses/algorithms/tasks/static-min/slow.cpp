#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(auto&x:a)cin>>x;while(q--){int l,r;cin>>l>>r;ll ans=LLONG_MAX;for(int i=l-1;i<r;i++)ans=min(ans,a[i]);cout<<ans<<'\n';}}
