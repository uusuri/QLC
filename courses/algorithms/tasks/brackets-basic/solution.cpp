#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;vector<char>st;for(char c:s){if(c=='('||c=='['||c=='{')st.push_back(c);else{if(st.empty()||(c==')'&&st.back()!='(')||(c==']'&&st.back()!='[')||(c=='}'&&st.back()!='{')){cout<<0;return 0;}st.pop_back();}}cout<<st.empty();}
