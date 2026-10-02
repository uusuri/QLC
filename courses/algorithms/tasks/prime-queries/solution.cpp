#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,q;cin>>n>>q;vector<bool>p(n+1,true);p[0]=false;if(n>=1)p[1]=false;for(int i=2;i<=n/i;i++)if(p[i])for(int j=i*i;j<=n;j+=i)p[j]=false;vector<int>s(n+1);for(int i=1;i<=n;i++)s[i]=s[i-1]+p[i];while(q--){int l,r;cin>>l>>r;cout<<s[r]-s[l-1]<<'\n';}}
