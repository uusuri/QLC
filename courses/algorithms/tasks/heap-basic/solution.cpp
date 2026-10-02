#include <bits/stdc++.h>
using namespace std;
int main(){int n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;make_heap(a.begin(),a.end(),greater<long long>());while(k--){pop_heap(a.begin(),a.end(),greater<long long>());cout<<a.back()<<' ';a.pop_back();}}
