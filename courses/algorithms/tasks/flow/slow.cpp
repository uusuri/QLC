#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n,m;cin>>n>>m;vector<tuple<int,int,ll>>e(m);for(auto&[u,v,c]:e){cin>>u>>v>>c;--u;--v;}vector<bool>s(n);s[0]=true;ll best=LLONG_MAX;function<void(int)>f=[&](int i){if(i==n-1){ll z=0;for(auto[u,v,c]:e)if(s[u]&&!s[v])z+=c;best=min(best,z);return;}s[i]=false;f(i+1);s[i]=true;f(i+1);};f(1);cout<<best<<"\n";}
