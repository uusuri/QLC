#include <bits/stdc++.h>
using namespace std;
using ll = long long;
vector<ll>t,lazy,a;void build(int v,int l,int r){if(l==r){t[v]=a[l];return;}int m=(l+r)/2;build(v*2,l,m);build(v*2+1,m+1,r);t[v]=max(t[v*2],t[v*2+1]);}void apply(int v,ll x){t[v]+=x;lazy[v]+=x;}void push(int v){apply(v*2,lazy[v]);apply(v*2+1,lazy[v]);lazy[v]=0;}
void upd(int v,int l,int r,int L,int R,ll x){if(R<l||r<L)return;if(L<=l&&r<=R){apply(v,x);return;}push(v);int m=(l+r)/2;upd(v*2,l,m,L,R,x);upd(v*2+1,m+1,r,L,R,x);t[v]=max(t[v*2],t[v*2+1]);}
ll ask(int v,int l,int r,int L,int R){if(R<l||r<L)return 0;if(L<=l&&r<=R)return t[v];push(v);int m=(l+r)/2;return max(ask(v*2,l,m,L,R),ask(v*2+1,m+1,r,L,R));}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;a.resize(n);t.resize(4*n);lazy.resize(4*n);for(auto&x:a)cin>>x;build(1,0,n-1);while(q--){char c;int l,r;cin>>c>>l>>r;--l;--r;if(c=='+'){ll x;cin>>x;upd(1,0,n-1,l,r,x);}else cout<<ask(1,0,n-1,l,r)<<"\n";}}
