#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;ll K;cin>>n>>K;vector<ll>a(n);for(auto&x:a)cin>>x;ll z=0;for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)z+=abs(a[i]-a[j])<=K;cout<<z<<"\n";}
