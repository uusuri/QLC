#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int n;cin>>n;vector<string>a(n);for(auto&x:a)cin>>x;while(a.size()>1){size_t i=0;while(a[i]!="+"&&a[i]!="-"&&a[i]!="*")i++;ll x=stoll(a[i-2]),y=stoll(a[i-1]);ll z=a[i]=="+"?x+y:a[i]=="-"?x-y:x*y;a[i-2]=to_string(z);a.erase(a.begin()+i-1,a.begin()+i+1);}cout<<a[0]<<'\n';}
