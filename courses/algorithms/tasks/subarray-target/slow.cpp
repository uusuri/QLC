#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;ll k;cin>>n>>k;vector<ll>a(n);for(auto&x:a)cin>>x;ll z=0;for(int i=0;i<n;i++){ll s=0;for(int j=i;j<n;j++){s+=a[j];z+=s==k;}}cout<<z<<"\n";}
