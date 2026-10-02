#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){unsigned long long a,b,m;cin>>a>>b>>m;unsigned long long ans=1%m;a%=m;while(b){if(b&1)ans=(__uint128_t)ans*a%m;a=(__uint128_t)a*a%m;b>>=1;}cout<<ans<<'\n';}
