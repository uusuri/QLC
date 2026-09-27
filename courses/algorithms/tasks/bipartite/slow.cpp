#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int n;vector<pair<int,int>>e;vector<int>c;bool f(int i){if(i==n){for(auto[u,v]:e)if(c[u]==c[v])return false;return true;}c[i]=0;if(f(i+1))return true;c[i]=1;return f(i+1);}int main(){int m;cin>>n>>m;e.resize(m);c.resize(n);for(auto&[u,v]:e){cin>>u>>v;--u;--v;}cout<<(f(0)?"YES":"NO")<<"\n";}
