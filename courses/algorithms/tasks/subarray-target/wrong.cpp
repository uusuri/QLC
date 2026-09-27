#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;ll k;cin>>n>>k;map<ll,ll>f;f[0]=0;ll p=0,ans=0;while(n--){ll x;cin>>x;p+=x;auto it=f.find(p-k);if(it!=f.end())ans+=it->second;f[p]++;}cout<<ans<<"\n";}
