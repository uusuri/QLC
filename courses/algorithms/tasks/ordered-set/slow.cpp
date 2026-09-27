#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int q;cin>>q;unordered_set<ll>s;while(q--){char op;ll x;cin>>op>>x;if(op=='+')s.insert(x);else if(op=='-')s.erase(x);else{ll z=LLONG_MAX;for(ll v:s)if(v>=x)z=min(z,v);if(z==LLONG_MAX)cout<<"NONE\n";else cout<<z<<"\n";}}}
