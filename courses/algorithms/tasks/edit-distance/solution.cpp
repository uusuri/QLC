#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);string a,b;cin>>a>>b;if(a.size()<b.size())swap(a,b);int m=b.size();vector<int>p(m+1),d(m+1);iota(p.begin(),p.end(),0);for(int i=1;i<=(int)a.size();i++){d[0]=i;for(int j=1;j<=m;j++)d[j]=min({p[j]+1,d[j-1]+1,p[j-1]+(a[i-1]!=b[j-1])});swap(p,d);}cout<<p[m]<<"\n";}
