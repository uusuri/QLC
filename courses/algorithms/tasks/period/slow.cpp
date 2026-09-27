#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){string s;cin>>s;int n=s.size();for(int k=1;k<=n;k++){bool ok=true;for(int i=k;i<n;i++)if(s[i]!=s[i%k])ok=false;if(ok&&n%k==0){cout<<k<<"\n";return 0;}}}
