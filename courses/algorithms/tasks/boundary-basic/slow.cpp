#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;cin>>n>>q;vector<long long>a(n);for(auto&x:a)cin>>x;while(q--){long long x;cin>>x;int i=0;while(i<n&&a[i]<x)i++;cout<<i<<'\n';}}
