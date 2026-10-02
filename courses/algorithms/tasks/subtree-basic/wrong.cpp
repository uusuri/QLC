#include <bits/stdc++.h>
using namespace std;
int main(){int n;cin>>n;vector<int>degree(n);for(int i=1;i<n;i++){int a,b;cin>>a>>b;degree[a-1]++;degree[b-1]++;}for(int v=0;v<n;v++)cout<<degree[v]+1<<' ';}
