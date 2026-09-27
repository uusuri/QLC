#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,q;cin>>n>>q;vector<ll>a(n+1);for(int i=1;i<=n;i++)cin>>a[i];while(q--){char c;int l;ll r;cin>>c>>l>>r;if(c=='+')a[l]+=r;else{ll z=0;for(int i=l;i<=r;i++)z+=a[i];cout<<z<<"\n";}}}
