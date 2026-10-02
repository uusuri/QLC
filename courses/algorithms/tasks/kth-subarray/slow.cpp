#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(ll&x:a)cin>>x;while(q--){int l,r,k;cin>>l>>r>>k;vector<ll>b(a.begin()+l-1,a.begin()+r);sort(b.begin(),b.end());cout<<b[k-1]<<'\n';}}
