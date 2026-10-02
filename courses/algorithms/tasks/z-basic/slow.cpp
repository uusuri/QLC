#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;cout<<0<<' ';for(int i=1;i<(int)s.size();i++){int j=0;while(i+j<(int)s.size()&&s[j]==s[i+j])j++;cout<<j<<' ';}}
