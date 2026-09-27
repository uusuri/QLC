#include <bits/stdc++.h>
using namespace std;
using ll = long long;
string a,b;int f(int i,int j){if(i==0)return j;if(j==0)return i;return min({f(i-1,j)+1,f(i,j-1)+1,f(i-1,j-1)+(a[i-1]!=b[j-1])});}int main(){cin>>a>>b;cout<<f(a.size(),b.size())<<"\n";}
