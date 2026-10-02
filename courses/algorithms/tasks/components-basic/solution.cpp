#include <bits/stdc++.h>
using namespace std;
int main(){int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int a,b;cin>>a>>b;--a;--b;g[a].push_back(b);g[b].push_back(a);}vector<int>seen(n);int answer=0;for(int v=0;v<n;v++)if(!seen[v]){answer++;vector<int>stack={v};seen[v]=1;while(!stack.empty()){int a=stack.back();stack.pop_back();for(int b:g[a])if(!seen[b]){seen[b]=1;stack.push_back(b);}}}cout<<answer;}
