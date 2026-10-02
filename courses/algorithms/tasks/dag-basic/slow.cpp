#include <bits/stdc++.h>
using namespace std;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);vector<int>d(n);while(m--){int a,b;cin>>a>>b;g[a-1].push_back(b-1);d[b-1]++;}vector<int>done(n);for(int k=0;k<n;k++){int v=-1;for(int i=0;i<n;i++)if(!done[i]&&d[i]==0){v=i;break;}if(v==-1){cout<<0;return 0;}done[v]=1;for(int u:g[v])d[u]--;}cout<<1;}
