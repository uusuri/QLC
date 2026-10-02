#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){unsigned long long a,b,m;cin>>a>>b>>m;unsigned long long ans=1%m;for(unsigned long long i=0;i<b;i++)ans=(__uint128_t)ans*a%m;cout<<ans<<'\n';}
