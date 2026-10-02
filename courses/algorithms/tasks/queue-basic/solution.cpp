#include <bits/stdc++.h>
using namespace std;
int main(){int q;cin>>q;queue<long long>a;while(q--){char c;cin>>c;if(c=='+'){long long x;cin>>x;a.push(x);}else{cout<<a.front()<<'\n';a.pop();}}}
