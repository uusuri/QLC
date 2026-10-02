#include <bits/stdc++.h>
using namespace std;
int main(){int n,k;cin>>n>>k;set<long long>a;while(n--){long long x;cin>>x;a.insert(x);}for(auto x:a){if(k--<=0)break;cout<<x<<' ';}}
