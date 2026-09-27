#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<pair<ll,ll>>a(n);for(auto&[r,l]:a)cin>>l>>r;sort(a.begin(),a.end());ll last=LLONG_MIN;int ans=0;for(auto[r,l]:a)if(l>=last){ans++;last=r;}cout<<ans<<"\n";}
