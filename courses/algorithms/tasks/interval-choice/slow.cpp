#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<pair<ll,ll>>a(n);for(auto&[l,r]:a)cin>>l>>r;ll last=LLONG_MIN;int ans=0;while(true){ll best=LLONG_MAX;for(auto[l,r]:a)if(l>=last)best=min(best,r);if(best==LLONG_MAX)break;last=best;ans++;}cout<<ans<<"\n";}
