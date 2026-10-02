#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ll n;cin>>n;ll ans=0;for(ll d=1;d<=n;d++)ans+=(n%d==0);cout<<ans<<'\n';}
