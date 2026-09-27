#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int k;cin>>k;vector<string>p(k);for(auto&s:p)cin>>s;string t;cin>>t;for(auto&s:p){ll z=0;for(int i=0;i+(int)s.size()<=(int)t.size();i++){bool ok=true;for(int j=0;j<(int)s.size();j++)if(s[j]!=t[i+j]){ok=false;break;}z+=ok;}cout<<z<<"\n";}}
