#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,k;cin>>n>>k;vector<ll>a(n);for(auto&x:a)cin>>x;sort(a.begin(),a.end());ll lo=0,hi=a.back()-a[0]+1;while(hi-lo>1){ll d=(lo+hi)/2,last=a[0];int cnt=1;for(int i=1;i<n;i++)if(a[i]-last>=d){cnt++;last=a[i];}if(cnt>=k)lo=d;else hi=d;}cout<<lo<<"\n";}
