#include <bits/stdc++.h>
using namespace std;using ll=long long;
bool prime(int x){if(x<2)return false;for(int d=2;d<=x/d;d++)if(x%d==0)return false;return true;}int main(){int n,q;cin>>n>>q;while(q--){int l,r;cin>>l>>r;int ans=0;for(int x=l;x<=r;x++)ans+=prime(x);cout<<ans<<'\n';}}
