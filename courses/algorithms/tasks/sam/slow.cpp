#include <bits/stdc++.h>
using namespace std;
using ll = long long;
int main(){string s;cin>>s;set<string>q;for(int i=0;i<(int)s.size();i++){string x;for(int j=i;j<(int)s.size();j++){x+=s[j];q.insert(x);}}cout<<q.size()<<"\n";}
