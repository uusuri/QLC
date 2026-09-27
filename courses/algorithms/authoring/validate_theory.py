"""Compile and execute the Markdown examples; no QLC judge or user data involved."""
from pathlib import Path
import itertools, json, os, re, shutil, subprocess, tempfile
from theory_languages import ROOT, LANGUAGES


def reference(a):
    return max(r-l for l in range(len(a)) for r in range(l+1,len(a)+1)
               if all(a[i-1]<a[i] for i in range(l+1,r)))


def build(lang, blocks):
    py=lang=='PYTHON311'; go=lang=='GO120'; rust=lang=='RUST2021'; php=lang=='PHP81'
    java=lang=='JAVA21'; cs=lang=='CSHARP_12'; ts=lang=='TYPESCRIPT5'; js=lang=='JAVASCRIPT_ES2022' or ts
    names=['run0','run1','loop0','loop1','loop2','loop3','visit']
    functions=[]
    for i,block in enumerate(blocks):
        name=names[i]
        if i==6:
            if py: block=block.replace('def visit(k):','def visit(k):\n    work()')
            else: block=block.replace('{','{ work();',1)
            functions.append(block); continue
        result='best' if i<2 else 'count'
        if py:
            body=(['global count','count = 0'] if i>=2 else [])+block.splitlines()+[f'return {result}']
            functions.append(f'def {name}(n'+(', a' if i<2 else '')+'):\n'+'\n'.join('    '+line for line in body))
        elif go:
            args='n int'+(', a []int' if i<2 else '')
            functions.append(f'func {name}({args}) int {{\n'+('count = 0\n' if i>=2 else '')+block+f'\nreturn {result}\n}}')
        elif rust:
            args='n: usize'+(', a: &[i32]' if i<2 else '')
            functions.append(f'fn {name}({args}) -> usize {{\n'+('COUNT.store(0, Ordering::Relaxed);\n' if i>=2 else '')+block+'\n'+('best' if i<2 else 'COUNT.load(Ordering::Relaxed)')+'\n}')
        else:
            prefix='static int' if java or cs else 'function' if php or js else 'int'
            args=('$n'+(', $a' if i<2 else '')) if php else ('n'+(': number' if ts else '')+(', a'+(': number[]' if ts else '') if i<2 else '')) if js else 'int n'+((', int[] a' if java or cs else ', int a[]') if i<2 else '')
            functions.append(f'{prefix} {name}({args})'+(': number' if ts else '')+' {\n'+('global $count; $count = 0;\n' if php and i>=2 else 'count = 0;\n' if i>=2 else '')+block+'\nreturn '+('$'+result if php else result)+';\n}')
    cases=[list(a) for n in range(1,6) for a in itertools.product((-1,0,1),repeat=n)]
    calls=[]; expected=[]
    for a in cases:
        for f in names[:2]:
            arr=','.join(map(str,a))
            literal='['+arr+']' if py or js or php else '[]int{'+arr+'}' if go else '&['+arr+']' if rust else 'new int[]{'+arr+'}' if java or cs else '(int[]){'+arr+'}' if lang=='C17' else 'vector<int>{'+arr+'}.data()'
            calls.append((f'{f}({len(a)}, {literal})',False));expected.append(reference(a))
    for n in range(65):
        length=n; shrinking=0
        while length: shrinking+=length;length//=2
        for f,value in zip(names[2:6],[2*n,n*(n-1)//2,max(0,n.bit_length()-1),shrinking]):
            calls.append((f'{f}({n})',False));expected.append(value)
    for n in range(9):
        calls.append((f'visit({n})',True));expected.append(2**(n+1)-1)
    main=[]
    for call,rec in calls:
        if rec:
            main.append('count = 0' if py or go else 'COUNT.store(0, Ordering::Relaxed);' if rust else '$count = 0;' if php else 'count = 0;')
            main.append(call+('' if py or go else ';'))
            call='COUNT.load(Ordering::Relaxed)' if rust else '$count' if php else 'count'
        main.append(f'print({call})' if py else f'fmt.Println({call})' if go else f'println!("{{}}", {call});' if rust else f'System.out.println({call});' if java else f'Console.WriteLine({call});' if cs else f'echo {call}, "\\n";' if php else f'console.log({call});' if js else f'printf("%d\\n", {call});')
    funcs='\n\n'.join(functions); body='\n'.join(main)
    if py: source='count = 0\ndef work():\n    global count\n    count += 1\n'+funcs+'\n'+body
    elif go: source='package main\nimport "fmt"\nvar count int\nfunc work(){count++}\n'+funcs+'\nfunc main(){\n'+body+'\n}'
    elif rust: source='use std::sync::atomic::{AtomicUsize, Ordering};\nstatic COUNT: AtomicUsize = AtomicUsize::new(0);\nfn work(){ COUNT.fetch_add(1, Ordering::Relaxed); }\n'+funcs+'\nfn main(){\n'+body+'\n}'
    elif java or cs: source=('using System;\n' if cs else '')+'class TheoryCheck {\nstatic int count;\nstatic void work(){count++;}\n'+funcs+'\n'+('static void Main()' if cs else 'public static void main(String[] args)')+'{\n'+body+'\n}}'
    elif js: source='let count = 0; function work(){count++;}\n'+funcs+'\n'+body
    elif php: source='<?php\n$count = 0; function work(){global $count; $count++;}\n'+funcs+'\n'+body
    else: source=('#include <bits/stdc++.h>\nusing std::max; using std::vector;\n' if lang=='CPP23' else '#include <stdio.h>\n')+'int count; void work(){count++;}\n'+funcs+'\nint main(){\n'+body+'\n}'
    return source,expected


def main():
    results=[]
    with tempfile.TemporaryDirectory(prefix='qlc-theory-') as temp:
        folder=Path(temp)
        for lang,(_,fence,_) in LANGUAGES.items():
            blocks=[]
            for name in ('01.md','01-asymptotics.md'):
                text=(ROOT/'theory'/lang/name).read_text()
                blocks+=re.findall(r'```'+fence+r'\n(.*?)```',text,re.S)
            assert len(blocks)==7,(lang,len(blocks))
            source,expected=build(lang,blocks)
            ext={'CPP23':'cpp','JAVA21':'java','PYTHON311':'py','JAVASCRIPT_ES2022':'js','TYPESCRIPT5':'ts','CSHARP_12':'cs','C17':'c','GO120':'go','PHP81':'php','RUST2021':'rs'}[lang]
            file=folder/('TheoryCheck.'+ext);file.write_text(source)
            out=folder/('check-'+lang)
            java='/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin/'
            commands={
                'CPP23':[['clang++','-std=c++23',str(file),'-o',str(out)],[str(out)]],
                'JAVA21':[[java+'javac',str(file)],[java+'java','-cp',temp,'TheoryCheck']],
                'PYTHON311':[['python3',str(file)]],
                'JAVASCRIPT_ES2022':[['node',str(file)]],
                'TYPESCRIPT5':[['node',str(ROOT.parents[1]/'frontend/node_modules/typescript/bin/tsc'),'--target','ES2022','--skipLibCheck',str(file)],['node',str(file.with_suffix('.js'))]],
                'CSHARP_12':[['csc',f'-out:{out}',str(file)],[str(out)]],
                'C17':[['clang','-std=c17',str(file),'-o',str(out)],[str(out)]],
                'GO120':[['go','run',str(file)]],
                'PHP81':[['php',str(file)]],
                'RUST2021':[['rustc','--edition','2021',str(file),'-o',str(out)],[str(out)]],
            }[lang]
            # Apple's clang has no bits/stdc++.h; explicit standard headers preserve the teaching fragments.
            if lang=='CPP23': file.write_text(source.replace('#include <bits/stdc++.h>','#include <algorithm>\n#include <vector>\n#include <cstdio>'))
            if not shutil.which(commands[0][0]):
                results.append(dict(language=lang,status='not_run',reason='runtime not installed'));continue
            for command in commands:
                run=subprocess.run(command,text=True,capture_output=True,timeout=90,env={**os.environ, "GOCACHE": str(folder/"go-cache")})
                if run.returncode: raise RuntimeError(lang+'\n'+run.stderr[:5000])
            actual=list(map(int,run.stdout.split()))
            assert actual==expected,(lang,actual[:20],expected[:20])
            results.append(dict(language=lang,status='passed',examples=7,checks=len(expected)))
    report=dict(results=results,scope='Markdown fragments: both growth algorithms, operation counts for loops, recursion calls; arrays are nonempty.')
    (ROOT/'reports/theory-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__': main()
