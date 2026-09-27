#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(auto&x:a)cin>>x;while(q--){char c;int l,r;cin>>c>>l>>r;--l;if(c=='+'){ll x;cin>>x;for(int i=l;i<r;i++)a[i]+=x;}else{ll z=LLONG_MIN;for(int i=l;i<r;i++)z=max(z,a[i]);cout<<z<<"\n";}}}
