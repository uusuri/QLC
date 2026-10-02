#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;for(int i=0;i<(int)s.size();i++){int answer=0;for(int k=i;k>0;k--){if(s.compare(0,k,s,i-k+1,k)==0){answer=k;break;}}cout<<answer<<' ';}}
