#include <bits/stdc++.h>
using namespace std;
int main(){int q;cin>>q;vector<long long>a;while(q--){char c;cin>>c;if(c=='+'){long long x;cin>>x;a.push_back(x);}else{cout<<a[0]<<'\n';vector<long long>b(a.begin()+1,a.end());a.swap(b);}}}
