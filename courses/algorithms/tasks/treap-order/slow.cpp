#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int q;cin>>q;multiset<ll>s;while(q--){char c;ll x;cin>>c>>x;if(c=='+')s.insert(x);else if(c=='-'){auto it=s.find(x);if(it!=s.end())s.erase(it);}else{if(x>(ll)s.size())cout<<"NONE\n";else{auto it=s.begin();advance(it,x-1);cout<<*it<<"\n";}}}}
