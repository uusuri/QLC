#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;ll S;cin>>n>>S;vector<ll>a(n);for(auto&x:a)cin>>x;int z=n+1;for(int i=0;i<n;i++){ll s=0;for(int j=i;j<n;j++){s+=a[j];if(s>=S)z=min(z,j-i+1);}}cout<<(z==n+1?0:z)<<"\n";}
