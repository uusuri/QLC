#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(auto&x:a)cin>>x;while(q--){int l,r;cin>>l>>r;ll s=0;for(int i=l-1;i<r;i++)s+=a[i];cout<<s<<"\n";}}
