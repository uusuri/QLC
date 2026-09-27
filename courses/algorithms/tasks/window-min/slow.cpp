#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,k;cin>>n>>k;vector<ll>a(n);for(auto&x:a)cin>>x;for(int i=0;i+k<=n;i++){ll z=a[i];for(int j=i;j<i+k;j++)z=min(z,a[j]);cout<<z<<"\n";}}
