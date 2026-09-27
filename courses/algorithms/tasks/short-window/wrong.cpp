#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;ll S;cin>>n>>S;vector<ll>a(n);for(auto&x:a)cin>>x;ll sum=0;int l=0,ans=n+1;for(int r=0;r<n;r++){sum+=a[r];while(sum>S){ans=min(ans,r-l+1);sum-=a[l++];}}cout<<(ans==n+1?0:ans)<<"\n";}
