#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;for(int i=0;i<n;i++)for(int j=0;j+1<n;j++)if(a[j]>a[j+1])swap(a[j],a[j+1]);for(auto x:a)cout<<x<<' ';}
