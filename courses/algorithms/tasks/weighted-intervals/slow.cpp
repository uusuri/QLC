#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<tuple<ll,ll,ll>>a(n);for(auto&[r,l,v]:a)cin>>l>>r>>v;sort(a.begin(),a.end());vector<ll>d(n+1);for(int i=0;i<n;i++){auto[r,l,v]=a[i];int j=0;for(int t=0;t<i;t++)if(get<0>(a[t])<=l)j=t+1;d[i+1]=max(d[i],d[j]+v);}cout<<d[n]<<"\n";}
