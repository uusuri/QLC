#include <bits/stdc++.h>
using namespace std;
int main(){int n,m;cin>>n>>m;vector<int>seen(n);while(m--){int a,b;cin>>a>>b;seen[a-1]=seen[b-1]=1;}int isolated=0;for(int x:seen)isolated+=!x;cout<<isolated+1;}
