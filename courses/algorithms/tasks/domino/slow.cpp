#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int n,m;vector<bool>a;ll f(){int p=0;while(p<n*m&&a[p])p++;if(p==n*m)return 1;ll z=0;a[p]=true;if(p%m+1<m&&!a[p+1]){a[p+1]=true;z+=f();a[p+1]=false;}if(p+m<n*m&&!a[p+m]){a[p+m]=true;z+=f();a[p+m]=false;}a[p]=false;return z%1000000007;}int main(){cin>>n>>m;a.resize(n*m);cout<<f()<<"\n";}
