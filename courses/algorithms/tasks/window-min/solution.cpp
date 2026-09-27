#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n,k;cin>>n>>k;deque<pair<int,ll>>d;for(int i=0;i<n;i++){ll x;cin>>x;while(!d.empty()&&d.front().first<=i-k)d.pop_front();while(!d.empty()&&d.back().second>=x)d.pop_back();d.push_back({i,x});if(i>=k-1)cout<<d.front().second<<"\n";}}
