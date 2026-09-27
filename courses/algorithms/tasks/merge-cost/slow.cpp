#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<ll>a(n);for(auto&x:a)cin>>x;ll z=0;while(a.size()>1){sort(a.begin(),a.end());ll s=a[0]+a[1];z+=s;a.erase(a.begin(),a.begin()+2);a.push_back(s);}cout<<z<<"\n";}
