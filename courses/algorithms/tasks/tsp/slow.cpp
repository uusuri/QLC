#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){int n;cin>>n;vector<vector<ll>>c(n,vector<ll>(n));for(auto&r:c)for(auto&x:r)cin>>x;vector<int>p;for(int i=1;i<n;i++)p.push_back(i);ll ans=LLONG_MAX;do{ll z=0;int v=0;for(int u:p){z+=c[v][u];v=u;}ans=min(ans,z+c[v][0]);}while(next_permutation(p.begin(),p.end()));cout<<ans<<"\n";}
