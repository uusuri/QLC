#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;vector<ll>d(n+2);while(q--){int l,r;ll x;cin>>l>>r>>x;d[l]+=x;d[r+1]-=x;}ll s=0;for(int i=1;i<=n;i++){s+=d[i];cout<<s<<"\n";}}
