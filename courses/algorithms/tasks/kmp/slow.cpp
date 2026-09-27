#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){string p,t;cin>>p>>t;int z=0;for(int i=0;i+(int)p.size()<=(int)t.size();i++){bool ok=true;for(int j=0;j<(int)p.size();j++)if(p[j]!=t[i+j]){ok=false;break;}z+=ok;}cout<<z<<"\n";}
