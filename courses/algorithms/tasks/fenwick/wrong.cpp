#include <bits/stdc++.h>
using namespace std;
using ll = long long;
struct BIT{int n;vector<ll>t;BIT(int n):n(n),t(n+1){}void add(int i,ll x){for(;i<=n;i+=i&-i)t[i]+=x;}ll sum(int i){ll s=0;for(;i>0;i-=i&-i)s+=t[i];return s;}};
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;BIT b(n);for(int i=1;i<=n;i++){ll x;cin>>x;b.add(i,x);}while(q--){char c;int l;ll r;cin>>c>>l>>r;if(c=='+')b.add(l,r);else cout<<b.sum((int)r)-b.sum(l)<<"\n";}}
