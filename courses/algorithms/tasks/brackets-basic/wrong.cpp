#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int balance=0;for(char c:s){if(c=='('||c=='['||c=='{')balance++;else balance--;if(balance<0){cout<<0;return 0;}}cout<<(balance==0);}
