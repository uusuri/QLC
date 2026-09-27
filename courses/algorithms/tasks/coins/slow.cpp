#include <bits/stdc++.h>
using namespace std;
using ll = long long;
vector<int>c;int f(int s){if(s==0)return 0;int z=1000000;for(int x:c)if(x<=s)z=min(z,1+f(s-x));return z;}int main(){int n,S;cin>>n>>S;c.resize(n);for(auto&x:c)cin>>x;int z=f(S);cout<<(z>=1000000?-1:z)<<"\n";}
