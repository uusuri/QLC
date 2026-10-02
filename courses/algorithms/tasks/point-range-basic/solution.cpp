#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;cin>>n>>q;int base=1;while(base<n)base*=2;vector<long long>t(2*base);for(int i=0;i<n;i++)cin>>t[base+i];for(int i=base-1;i;i--)t[i]=t[2*i]+t[2*i+1];while(q--){char c;cin>>c;if(c=='='){int p;long long x;cin>>p>>x;p+=base;t[p]=x;while(p>1){p/=2;t[p]=t[2*p]+t[2*p+1];}}else{int l,r;cin>>l>>r;l+=base;r+=base;long long s=0;while(l<r){if(l&1)s+=t[l++];if(r&1)s+=t[--r];l/=2;r/=2;}cout<<s<<'\n';}}}
