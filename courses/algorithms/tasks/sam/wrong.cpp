#include <bits/stdc++.h>
using namespace std;
using ll = long long;
struct N{array<int,26>go;int len=0,link=-1;N(){go.fill(-1);}};int main(){ios::sync_with_stdio(false);cin.tie(nullptr);string s;cin>>s;vector<N>t(1);int last=0;for(char ch:s){int c=ch-'a',cur=t.size();t.emplace_back();t[cur].len=t[last].len+1;int p=last;while(p!=-1&&t[p].go[c]==-1){t[p].go[c]=cur;p=t[p].link;}if(p==-1)t[cur].link=0;else{int q=t[p].go[c];if(t[p].len+1==t[q].len)t[cur].link=q;else{int clone=t.size();t.push_back(t[q]);t[clone].len=t[p].len+1;while(p!=-1&&t[p].go[c]==q){t[p].go[c]=clone;p=t[p].link;}t[q].link=t[cur].link=clone;}}last=cur;}ll ans=0;for(int v=1;v<(int)t.size();v++)ans+=t[v].len;cout<<ans<<"\n";}
