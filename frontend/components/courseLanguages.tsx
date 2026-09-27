import type { SubmissionLanguage } from "@/types";

export const COURSE_LANGUAGES: { id: SubmissionLanguage; label: string; monaco: string; file: string; starter: string }[] = [
  { id: "CPP23", label: "C++", monaco: "cpp", file: "main.cpp", starter: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}\n" },
  { id: "JAVA21", label: "Java", monaco: "java", file: "Main.java", starter: "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n" },
  { id: "PYTHON311", label: "Python", monaco: "python", file: "main.py", starter: "import sys\n\ndef main():\n    pass\n\nif __name__ == \"__main__\":\n    main()\n" },
  { id: "JAVASCRIPT_ES2022", label: "JavaScript", monaco: "javascript", file: "main.js", starter: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n" },
  { id: "TYPESCRIPT5", label: "TypeScript", monaco: "typescript", file: "main.ts", starter: "import * as fs from 'fs';\nconst input: string = fs.readFileSync(0, 'utf8').trim();\n\n" },
  { id: "CSHARP_12", label: "C#", monaco: "csharp", file: "Program.cs", starter: "using System;\n\nclass Program {\n    static void Main() {\n        \n    }\n}\n" },
  { id: "C17", label: "C", monaco: "c", file: "main.c", starter: "#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n" },
  { id: "GO120", label: "Go", monaco: "go", file: "main.go", starter: "package main\n\nfunc main() {\n    \n}\n" },
  { id: "PHP81", label: "PHP", monaco: "php", file: "main.php", starter: "<?php\n$input = trim(stream_get_contents(STDIN));\n\n" },
  { id: "RUST2021", label: "Rust", monaco: "rust", file: "main.rs", starter: "use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n}\n" }
];

export function courseLanguage(language: string | null | undefined) {
  return COURSE_LANGUAGES.find(item => item.id === language) ?? COURSE_LANGUAGES[0];
}
