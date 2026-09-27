#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,S;cin>>n>>S;vector<int>c(n),dp(S+1,S+1);for(auto&x:c)cin>>x;dp[0]=0;for(int s=1;s<=S;s++)for(int x:c)if(x<=s)dp[s]=min(dp[s],dp[s-x]+1);cout<<(dp[S]>S?-1:dp[S])<<"\n";}
