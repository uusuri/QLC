#include <bits/stdc++.h>
using namespace std;
using ll = long long;
mt19937 rng(712367821);struct N{ll x,s;unsigned pr;int sz=1,cnt=1;bool rev=false;N *l=nullptr,*r=nullptr;N(ll x):x(x),s(x),pr(rng()){}};int size(N*t){return t?t->sz:0;}ll sum(N*t){return t?t->s:0;}void pull(N*t){if(t){t->sz=size(t->l)+size(t->r)+t->cnt;t->s=sum(t->l)+sum(t->r)+t->x*t->cnt;}}void push(N*t){if(t&&t->rev){swap(t->l,t->r);if(t->l)t->l->rev^=1;if(t->r)t->r->rev^=1;t->rev=false;}}N*merge(N*a,N*b){if(!a)return b;if(!b)return a;push(a);push(b);if(a->pr>b->pr){a->r=merge(a->r,b);pull(a);return a;}b->l=merge(a,b->l);pull(b);return b;}
void split(N*t,int k,N*&a,N*&b){if(!t){a=b=nullptr;return;}push(t);if(size(t->l)>=k){b=t;split(t->l,k,a,b->l);pull(b);}else{a=t;split(t->r,k-size(t->l)-1,a->r,b);pull(a);}}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;N*root=nullptr;for(int i=0;i<n;i++){ll x;cin>>x;root=merge(root,new N(x));}while(q--){char op;int l,r;cin>>op>>l>>r;N*a,*b,*c;split(root,r,a,c);split(a,l-1,a,b);if(op=='R')b->rev=false;else cout<<sum(b)<<"\n";root=merge(merge(a,b),c);}}
