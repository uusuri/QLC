#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<ll>a(n);for(auto &x:a)cin>>x;int ans=1;for(int i=0;i<n;i++){int j=i;while(j+1<n&&a[j]<a[j+1])j++;ans=max(ans,j-i+1);}cout<<ans<<"\n";}
