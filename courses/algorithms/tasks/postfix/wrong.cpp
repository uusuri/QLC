#include <bits/stdc++.h>
using namespace std;using ll=long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;vector<ll>s;string x;while(n--){cin>>x;if(x=="+"||x=="-"||x=="*"){ll b=s.back();s.pop_back();ll a=s.back();s.pop_back();s.push_back(x=="+"?a+b:x=="-"?b-a:a*b);}else s.push_back(stoll(x));}cout<<s.back()<<'\n';}
