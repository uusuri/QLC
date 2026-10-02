#include <bits/stdc++.h>
using namespace std;
int main(){int q;cin>>q;vector<long long>a;while(q--){char c;cin>>c;if(c=='+'){long long x;cin>>x;a.push_back(x);}else{cout<<a.back()<<'\n';a.pop_back();}}}
