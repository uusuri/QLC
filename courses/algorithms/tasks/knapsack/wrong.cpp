#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,W;cin>>n>>W;vector<ll>d(W+1);while(n--){int w;ll v;cin>>w>>v;for(int c=w;c<=W;c++)d[c]=max(d[c],d[c-w]+v);}cout<<d[W]<<"\n";}
