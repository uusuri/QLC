#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,k;cin>>n>>k;vector<ll>a(n);ll lo=0,hi=0;for(auto&x:a){cin>>x;lo=max(lo,x);hi+=x;}for(ll c=lo;c<=hi;c++){ll s=0;int z=1;for(ll x:a){if(s+x>c){z++;s=0;}s+=x;}if(z<=k){cout<<c<<"\n";return 0;}}}
