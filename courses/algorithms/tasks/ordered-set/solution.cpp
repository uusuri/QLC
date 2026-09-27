#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int q;cin>>q;set<ll>s;while(q--){char op;ll x;cin>>op>>x;if(op=='+')s.insert(x);else if(op=='-')s.erase(x);else{auto it=s.lower_bound(x);if(it==s.end())cout<<"NONE\n";else cout<<*it<<"\n";}}}
