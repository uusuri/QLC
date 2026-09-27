#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n);for(auto&x:a)cin>>x;while(q--){int l,r;cin>>l>>r;set<ll>s;for(int i=l-1;i<r;i++)s.insert(a[i]);cout<<s.size()<<"\n";}}
