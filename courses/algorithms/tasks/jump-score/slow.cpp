#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,k;cin>>n>>k;vector<ll>a(n),d(n,LLONG_MIN);for(auto&x:a)cin>>x;d[0]=a[0];for(int i=1;i<n;i++)for(int j=max(0,i-k);j<i;j++)d[i]=max(d[i],d[j]+a[i]);cout<<d.back()<<"\n";}
