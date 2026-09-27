#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,cur=0,ans=0;cin>>n;ll prev=0,x;for(int i=0;i<n;i++){cin>>x;cur=(i>0 && prev<=x)?cur+1:1;ans=max(ans,cur);prev=x;}cout<<ans<<"\n";}
