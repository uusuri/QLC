#include <bits/stdc++.h>
using namespace std;
int main(){int n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;while(k--){auto it=min_element(a.begin(),a.end());cout<<*it<<' ';a.erase(it);}}
