#include <bits/stdc++.h>
using namespace std;
using ll = long long;
struct BIT{int n;vector<ll>t;BIT(int n):n(n),t(n+1){}void add(int i,ll x){for(;i<=n;i+=i&-i)t[i]+=x;}ll sum(int i){ll s=0;for(;i>0;i-=i&-i)s+=t[i];return s;}};
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;vector<ll>a(n+1),ans(q);for(int i=1;i<=n;i++)cin>>a[i];vector<tuple<int,int,int>>qs(q);for(int i=0;i<q;i++){int l,r;cin>>l>>r;qs[i]={r,l,i};}sort(qs.begin(),qs.end());BIT b(n);map<ll,int>last;int cur=0;for(auto[r,l,id]:qs){while(cur<r){++cur;int p=last[a[cur]];b.add(cur,1);last[a[cur]]=cur;}ans[id]=b.sum(r)-b.sum(l-1);}for(ll x:ans)cout<<x<<"\n";}
