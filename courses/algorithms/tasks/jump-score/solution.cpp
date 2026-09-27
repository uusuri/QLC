#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,k;cin>>n>>k;deque<pair<int,ll>>d;ll ans=0;for(int i=0;i<n;i++){ll x;cin>>x;while(!d.empty()&&d.front().first<i-k)d.pop_front();ans=x+(i==0?0:d.front().second);while(!d.empty()&&d.back().second<=ans)d.pop_back();d.push_back({i,ans});}cout<<ans<<"\n";}
