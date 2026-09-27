#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,m,q;cin>>n>>m>>q;const ll I=4000000000000000000LL;vector<vector<ll>>d(n,vector<ll>(n,I));for(int i=0;i<n;i++)d[i][i]=0;while(m--){int u,v;ll w;cin>>u>>v>>w;--u;--v;d[u][v]=w;}for(int k=0;k<n;k++)for(int i=0;i<n;i++)if(d[i][k]!=I)for(int j=0;j<n;j++)if(d[k][j]!=I)d[i][j]=min(d[i][j],d[i][k]+d[k][j]);while(q--){int s,t;cin>>s>>t;ll z=d[s-1][t-1];if(z==I)cout<<"INF\n";else cout<<z<<"\n";}}
