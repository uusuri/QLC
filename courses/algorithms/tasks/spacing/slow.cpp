#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,k;cin>>n>>k;vector<ll>a(n);for(auto&x:a)cin>>x;sort(a.begin(),a.end());ll ans=0;for(ll d=1;d<=a.back()-a[0];d++){int c=1;ll last=a[0];for(int i=1;i<n;i++)if(a[i]-last>=d){c++;last=a[i];}if(c<k)break;ans=d;}cout<<ans<<"\n";}
