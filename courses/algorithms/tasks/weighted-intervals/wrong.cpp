#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<tuple<ll,ll,ll>>a(n);for(auto&[r,l,v]:a)cin>>l>>r>>v;sort(a.begin(),a.end());vector<ll>ends(n),d(n+1);for(int i=0;i<n;i++)ends[i]=get<0>(a[i]);for(int i=0;i<n;i++){auto[r,l,v]=a[i];int j=lower_bound(ends.begin(),ends.begin()+i,l)-ends.begin();d[i+1]=max(d[i],d[j]+v);}cout<<d[n]<<"\n";}
