#include <bits/stdc++.h>
using namespace std;
int main(){int q;cin>>q;multiset<long long>s;while(q--){char c;long long x;cin>>c>>x;if(c=='+')s.insert(x);else if(c=='-'){auto it=s.find(x);if(it!=s.end())s.erase(it);}else cout<<(s.count(x)>0)<<'\n';}}
