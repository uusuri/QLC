#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<ll>a(n);for(auto&x:a)cin>>x;vector<int>s,ans(n,-1);for(int i=n-1;i>=0;i--){while(!s.empty()&&a[s.back()]>=a[i])s.pop_back();if(!s.empty())ans[i]=s.back()+1;s.push_back(i);}for(int x:ans)cout<<x<<"\n";}
