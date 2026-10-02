#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){int h,w,q;cin>>h>>w>>q;vector<vector<ll>>a(h,vector<ll>(w));for(auto&r:a)for(ll&x:r)cin>>x;while(q--){int y1,x1,y2,x2;cin>>y1>>x1>>y2>>x2;ll s=0;for(int y=y1-1;y<y2;y++)for(int x=x1-1;x<x2;x++)s+=a[y][x];cout<<s<<'\n';}}
