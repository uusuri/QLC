#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;while(!s.empty()){size_t p=s.find("()");if(p==string::npos)p=s.find("[]");if(p==string::npos)p=s.find("{}");if(p==string::npos){cout<<0;return 0;}s.erase(p,2);}cout<<1;}
