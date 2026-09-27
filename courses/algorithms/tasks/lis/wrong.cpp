#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<ll>t;while(n--){ll x;cin>>x;auto it=upper_bound(t.begin(),t.end(),x);if(it==t.end())t.push_back(x);else *it=x;}cout<<t.size()<<"\n";}
