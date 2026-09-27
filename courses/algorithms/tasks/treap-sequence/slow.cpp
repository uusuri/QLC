#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(auto&x:a)cin>>x;while(q--){char c;int l,r;cin>>c>>l>>r;--l;if(c=='R')reverse(a.begin()+l,a.begin()+r);else{ll s=0;for(int i=l;i<r;i++)s+=a[i];cout<<s<<"\n";}}}
