#include <bits/stdc++.h>
using namespace std;
using ll = long long;
vector<int>w;vector<ll>v;ll f(int i,int c){if(i==(int)w.size())return 0;ll z=f(i+1,c);if(w[i]<=c)z=max(z,v[i]+f(i+1,c-w[i]));return z;}int main(){int n,W;cin>>n>>W;w.resize(n);v.resize(n);for(int i=0;i<n;i++)cin>>w[i]>>v[i];cout<<f(0,W)<<"\n";}
