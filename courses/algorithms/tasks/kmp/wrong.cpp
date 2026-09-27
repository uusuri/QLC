#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);string p,t;cin>>p>>t;vector<int>pi(p.size());for(int i=1;i<(int)p.size();i++){int j=pi[i-1];while(j&&p[i]!=p[j])j=pi[j-1];if(p[i]==p[j])j++;pi[i]=j;}int j=0,ans=0;for(char c:t){while(j&&p[j]!=c)j=pi[j-1];if(p[j]==c)j++;if(j==(int)p.size()){ans++;j=0;}}cout<<ans<<"\n";}
