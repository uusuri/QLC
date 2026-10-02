#include <bits/stdc++.h>
using namespace std;
int main(){int q;cin>>q;set<long long>s;while(q--){char c;long long x;cin>>c>>x;if(c=='+')s.insert(x);else if(c=='-')s.erase(x);else cout<<s.count(x)<<'\n';}}
