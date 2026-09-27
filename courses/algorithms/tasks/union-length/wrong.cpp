#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<pair<ll,ll>>a(n);for(auto&[l,r]:a)cin>>l>>r;sort(a.begin(),a.end());ll L=a[0].first,R=a[0].second,ans=0;for(auto[l,r]:a){if(l<=R)R=r;else{ans+=R-L;L=l;R=r;}}cout<<ans+R-L<<"\n";}
