#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;cin>>n>>q;vector<long long>a(n);for(auto&x:a)cin>>x;while(q--){long long x;cin>>x;cout<<upper_bound(a.begin(),a.end(),x)-a.begin()<<'\n';}}
