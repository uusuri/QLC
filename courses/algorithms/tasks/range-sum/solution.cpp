#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;vector<ll>p(n+1);for(int i=1;i<=n;i++){ll x;cin>>x;p[i]=p[i-1]+x;}while(q--){int l,r;cin>>l>>r;cout<<p[r]-p[l-1]<<"\n";}}
