#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int h,w,q;cin>>h>>w>>q;vector<vector<ll>>p(h+1,vector<ll>(w+1));for(int y=1;y<=h;y++)for(int x=1;x<=w;x++){ll a;cin>>a;p[y][x]=a+p[y-1][x]+p[y][x-1]-p[y-1][x-1];}while(q--){int y1,x1,y2,x2;cin>>y1>>x1>>y2>>x2;cout<<p[y2][x2]-p[y1-1][x2]-p[y2][x1-1]+p[y1-1][x1-1]<<'\n';}}
