#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<ll>a(n);vector<int>d(n,1);for(auto&x:a)cin>>x;int z=1;for(int i=0;i<n;i++){for(int j=0;j<i;j++)if(a[j]<a[i])d[i]=max(d[i],d[j]+1);z=max(z,d[i]);}cout<<z<<"\n";}
