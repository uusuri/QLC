#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);while(q--){int l,r;ll x;cin>>l>>r>>x;for(int i=l-1;i<r;i++)a[i]+=x;}for(ll x:a)cout<<x<<"\n";}
