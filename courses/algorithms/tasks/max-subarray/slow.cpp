#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(auto&x:a)cin>>x;while(q--){int p;ll x;cin>>p>>x;a[p-1]=x;ll z=0,s=0;for(ll v:a){s=max(0LL,s+v);z=max(z,s);}cout<<z<<"\n";}}
