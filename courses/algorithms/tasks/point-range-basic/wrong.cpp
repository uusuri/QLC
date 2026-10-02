#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;cin>>n>>q;vector<long long>a(n);for(auto&x:a)cin>>x;while(q--){char c;cin>>c;int p;long long x;cin>>p>>x;if(c=='=')a[p]+=x;else{long long s=0;for(int i=p;i<x;i++)s+=a[i];cout<<s<<'\n';}}}
