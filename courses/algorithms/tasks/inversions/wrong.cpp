#include <bits/stdc++.h>
using namespace std;
using ll = long long;
vector<ll>a,b;ll solve(int l,int r){if(r-l<2)return 0;int m=(l+r)/2;ll ans=solve(l,m)+solve(m,r);int i=l,j=m,k=l;while(i<m||j<r){if(j==r||(i<m&&a[i]<a[j]))b[k++]=a[i++];else{ans+=m-i;b[k++]=a[j++];}}copy(b.begin()+l,b.begin()+r,a.begin()+l);return ans;}
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);int n;cin>>n;a.resize(n);b.resize(n);for(auto&x:a)cin>>x;cout<<solve(0,n)<<"\n";}
