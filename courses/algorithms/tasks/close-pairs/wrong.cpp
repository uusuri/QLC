#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;ll K;cin>>n>>K;vector<ll>a(n);for(auto&x:a)cin>>x;sort(a.begin(),a.end());ll ans=0;int l=0;for(int r=0;r<n;r++){while(a[r]-a[l]>K)l++;ans+=r-l+1;}cout<<ans<<"\n";}
