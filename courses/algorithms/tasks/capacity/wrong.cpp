#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,k;cin>>n>>k;vector<ll>a(n);ll lo=0,hi=0;for(auto&x:a){cin>>x;lo=max(lo,x);hi+=x;}while(lo<hi){ll mid=lo+(hi-lo)/2,s=0;int groups=1;for(ll x:a){if(s+x>mid){groups++;s=0;}s+=x;}if(groups<k)hi=mid;else lo=mid+1;}cout<<lo<<"\n";}
