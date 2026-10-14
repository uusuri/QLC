const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { parseGraphAnimation, graphFence, findGraphBlocks, insertGraphBlock, removeGraphNode, edgeGeometry, GRAPH_LIMITS } = load(path.join(__dirname, "../services/graphAnimation.ts"));
const { graphPreset, GRAPH_PRESETS } = load(path.join(__dirname, "../services/graphPresets.ts"));
const { SafeMarkdown } = load(path.join(__dirname, "../components/SafeMarkdown.tsx"));

test("all presets validate, serialize, and render through the lesson renderer", () => {
  for (const { id } of GRAPH_PRESETS) {
    const animation = graphPreset(id);
    const markdown = `До блока\n\n${graphFence(animation)}\n\nПосле блока`;
    const [block] = findGraphBlocks(markdown);
    assert.deepEqual(parseGraphAnimation(block.source), parseGraphAnimation(JSON.stringify(animation)));
    assert.equal(markdown.slice(block.start, block.end), graphFence(animation));
    const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown }));
    assert.match(html, /<svg/); assert.match(html, /Воспроизвести/); assert.match(html, /После блока/);
    assert.doesNotMatch(html, /<pre/);
  }
});

test("rejects invalid references, directed reverse traces, versions and excessive data", () => {
  const invalid = mutate => { const animation = graphPreset("blank"); mutate(animation); assert.throws(() => parseGraphAnimation(JSON.stringify(animation))); };
  invalid(a => { a.version = 2; });
  invalid(a => { a.nodes[0].x = -1; });
  invalid(a => { a.nodes.push(a.nodes[0]); });
  invalid(a => { a.steps = []; });
  invalid(a => { a.steps[0].edges[0].to = "missing"; });
  invalid(a => { a.steps[0].activeNodes = ["missing"]; });
  invalid(a => { a.steps[0].visitedEdges = ["missing"]; });
  invalid(a => { a.steps[0].pointers = [{ node: "missing", label: "head" }]; });
  invalid(a => { const edge = a.steps[0].edges[0]; edge.directed = true; a.steps[0].trace = { edge: edge.id, from: edge.to, to: edge.from }; });
  invalid(a => { a.steps = Array(GRAPH_LIMITS.steps + 1).fill(a.steps[0]); });
  assert.throws(() => parseGraphAnimation(" ".repeat(GRAPH_LIMITS.source + 1)));
});

test("allows reverse traces over undirected edges and self loops", () => {
  const animation = graphPreset("euler");
  const edge = animation.steps[0].edges[0];
  animation.steps[0].trace = { edge: edge.id, from: edge.to, to: edge.from };
  assert.doesNotThrow(() => parseGraphAnimation(JSON.stringify(animation)));
  edge.to = edge.from; animation.steps[0].trace.to = edge.from; animation.steps[0].trace.from = edge.from;
  assert.doesNotThrow(() => parseGraphAnimation(JSON.stringify(animation)));
  assert.match(edgeGeometry(animation.nodes, [edge], edge).path, / C /);
});

test("removing a node cleans all frames without mutating the original", () => {
  const animation = graphPreset("reverse"), before = JSON.stringify(animation);
  const next = removeGraphNode(animation, "A");
  assert.equal(JSON.stringify(animation), before);
  assert.doesNotThrow(() => parseGraphAnimation(JSON.stringify(next)));
  assert.ok(next.steps.every(step => step.edges.every(edge => edge.from !== "A" && edge.to !== "A")));
  assert.equal(next.steps[3].trace, undefined);
});

test("fenced content is escaped and separate blocks retain precise CRLF ranges", () => {
  const animation = graphPreset("blank");
  animation.steps[0].caption = "<script>alert(1)</script>\n```\n# Заголовок";
  const fence = graphFence(animation);
  assert.equal((fence.match(/```/g) || []).length, 2);
  assert.equal(parseGraphAnimation(findGraphBlocks(fence)[0].source).steps[0].caption, animation.steps[0].caption);
  const markdown = ("```js\nqlc-graph\n```\n\n" + fence + "\nТекст\n" + fence).replace(/\n/g, "\r\n");
  const blocks = findGraphBlocks(markdown);
  assert.equal(blocks.length, 2);
  for (const block of blocks) assert.equal(markdown.slice(block.start, block.end).replace(/\r\n/g, "\n"), fence);
  const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown: fence }));
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
});

test("invalid animation does not break surrounding theory", () => {
  const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { markdown: "До\n\n```qlc-graph\n{}\n```\n\nПосле" }));
  assert.match(html, /Не удалось показать анимацию/); assert.match(html, /После/);
});

test("inserting and repeatedly editing blocks preserves surrounding text and whitespace", () => {
  const animation = graphPreset("blank"), original = "До\n\nПосле";
  const inserted = insertGraphBlock(original, 4, 4, animation);
  assert.equal(inserted, `До\n\n${graphFence(animation)}\n\nПосле`);
  const range = findGraphBlocks(inserted)[0];
  assert.equal(insertGraphBlock(inserted, range.start, range.end, animation), inserted);
  assert.equal(insertGraphBlock("", 0, 0, animation), graphFence(animation));
});

test("reverse-list frames preserve old topology and parallel edges have distinct paths", () => {
  const animation = graphPreset("reverse");
  assert.deepEqual(animation.steps[0].edges.map(e => `${e.from}-${e.to}`), ["A-B", "B-C", "C-null"]);
  assert.deepEqual(animation.steps.at(-1).edges.map(e => `${e.from}-${e.to}`), ["A-null", "B-A", "C-B"]);
  const a = animation.steps[0].edges[0], b = { ...a, id: "back", from: a.to, to: a.from };
  const first = edgeGeometry(animation.nodes, [a, b], a).point(.5);
  const second = edgeGeometry(animation.nodes, [a, b], b).point(.5);
  assert.notEqual(first.y, second.y);
});
