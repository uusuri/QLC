#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ll n;cin>>n;ll ans=1;for(ll p=2;p<=n/p;p+=(p==2?1:2)){int a=0;while(n%p==0){n/=p;a++;}ans*=a+1;}if(n>1)ans*=2;cout<<ans<<'\n';}
