#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;priority_queue<ll,vector<ll>,greater<ll>>q;while(n--){ll x;cin>>x;q.push(x);}ll ans=0;while(q.size()>1){ll a=q.top();q.pop();ll b=q.top();q.pop();ans+=a+b;q.push(a+b);}cout<<ans<<"\n";}
