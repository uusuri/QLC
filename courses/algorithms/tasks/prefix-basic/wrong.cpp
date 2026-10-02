#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;vector<int>p(s.size());for(int i=1;i<(int)s.size();i++){int j=p[i-1];if(s[i]==s[j])j++;else j=0;p[i]=j;}for(int x:p)cout<<x<<' ';}
