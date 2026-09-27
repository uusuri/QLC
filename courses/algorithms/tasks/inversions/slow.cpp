#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<ll>a(n);for(auto&x:a)cin>>x;ll z=0;for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)z+=a[i]>a[j];cout<<z<<"\n";}
