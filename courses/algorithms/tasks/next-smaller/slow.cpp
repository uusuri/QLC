#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<ll>a(n);for(auto&x:a)cin>>x;for(int i=0;i<n;i++){int ans=-1;for(int j=i+1;j<n;j++)if(a[j]<a[i]){ans=j+1;break;}cout<<ans<<"\n";}}
