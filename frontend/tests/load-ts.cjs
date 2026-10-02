const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const cache = new Map();

// Scoped loader: compile local modules without installing global require hooks.
module.exports = function loadTs(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename, module);
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = specifier => {
    if (specifier.startsWith(".")) {
      const base = path.resolve(path.dirname(filename), specifier);
      const dependency = [base + ".ts", base + ".tsx"].find(existsSync);
      if (dependency) return loadTs(dependency);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText, filename);
  return compiled.exports;
};
