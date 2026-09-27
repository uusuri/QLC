#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<pair<ll,ll>>a(n);vector<ll>x;for(auto&[l,r]:a){cin>>l>>r;x.push_back(l);x.push_back(r);}sort(x.begin(),x.end());ll ans=0;for(int i=1;i<(int)x.size();i++){bool on=false;for(auto[l,r]:a)if(l<=x[i-1]&&r>=x[i])on=true;if(on)ans+=x[i]-x[i-1];}cout<<ans<<"\n";}
