#include <bits/stdc++.h>
using namespace std;
int main(){int q;cin>>q;vector<long long>s;while(q--){char c;long long x;cin>>c>>x;auto it=find(s.begin(),s.end(),x);if(c=='+'){if(it==s.end())s.push_back(x);}else if(c=='-'){if(it!=s.end())s.erase(it);}else cout<<(it!=s.end())<<'\n';}}
