const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const load = require("./load-ts.cjs");
const { historyStatus, historyMetrics, formatHistoryAnswer, canRestoreSubmission } = load(path.join(__dirname,"../services/submissionHistory.ts"));
const { SubmissionPayload } = load(path.join(__dirname,"../components/SubmissionPayload.tsx"));
const { getSubmissionHistory, getSubmissionHistoryDetail } = load(path.join(__dirname,"../services/api.ts"));

test("history distinguishes pending, demo, infrastructure and final verdicts",()=>{
  assert.equal(historyStatus({status:"DEMO",verdict:null}),"Демо · без проверки");
  assert.equal(historyStatus({status:"QUEUED",verdict:null}),"В очереди");
  assert.equal(historyStatus({status:"COMPILING",verdict:null}),"Компиляция");
  assert.equal(historyStatus({status:"INFRA_ERROR",verdict:null}),"Ошибка проверки");
  assert.equal(historyStatus({status:"FINISHED",verdict:"AC"}),"AC · Принято");
  assert.equal(historyStatus({status:"FINISHED",verdict:"WA"}),"WA · Неверный ответ");
});

test("history hides compiler and unavailable metrics rather than showing NaN",()=>{
  const row={status:"FINISHED",verdict:"AC",executionTime:12,memoryUsed:2048};
  assert.equal(historyMetrics(row),"12 мс / 2 МБ");
  assert.equal(historyMetrics({...row,verdict:"CE",memoryUsed:NaN}),"");
  assert.equal(historyMetrics({...row,status:"QUEUED"}),"");
  assert.equal(historyMetrics({...row,executionTime:null,memoryUsed:null}),"");
  assert.equal(historyMetrics({...row,executionTime:NaN,memoryUsed:Infinity}),"");
});

test("test answers use original indices and numeric answers retain exact text",()=>{
  assert.equal(formatHistoryAnswer("TEST","[0,2]"),"Выбраны варианты: 1, 3");
  assert.equal(formatHistoryAnswer("NUMERIC","12345678901234567890.000100"),"12345678901234567890.000100");
  assert.equal(formatHistoryAnswer("TEST",null),"Ответ не сохранён");
  assert.equal(formatHistoryAnswer("TEST",undefined),"Ответ не сохранён");
  assert.equal(formatHistoryAnswer("TEST","old-format"),"old-format");
});

test("restoration is limited to the same task, language and source byte limit",()=>{
  const detail={id:"attempt",taskId:42,language:"CPP23",sourceCode:"int main() {}",submittedAnswer:null};
  assert.equal(canRestoreSubmission(detail,42,"CPP23"),true);
  assert.equal(canRestoreSubmission(detail,43,"CPP23"),false);
  assert.equal(canRestoreSubmission(detail,42,"JAVA21"),false);
  assert.equal(canRestoreSubmission({...detail,sourceCode:null},42,"CPP23"),false);
  assert.equal(canRestoreSubmission({...detail,sourceCode:"я".repeat(40000)},42,"CPP23"),false);
});

test("submitted source and answers are escaped, not interpreted as HTML or Markdown",()=>{
  const source='<script>alert("x")</script>\n#include <iostream>';
  const detail={id:"x",taskId:1,language:"CPP23",sourceCode:source,submittedAnswer:null};
  const html=renderToStaticMarkup(React.createElement(SubmissionPayload,{detail,taskType:"CODE"}));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("\n#include &lt;iostream&gt;"));
  const answer=renderToStaticMarkup(React.createElement(SubmissionPayload,{detail:{...detail,sourceCode:null,submittedAnswer:"[0,2]"},taskType:"TEST"}));
  assert.ok(answer.includes("Выбраны варианты: 1, 3"));
  const omittedNulls=renderToStaticMarkup(React.createElement(SubmissionPayload,{detail:{id:"x",taskId:1,submittedAnswer:"[0,2]"},taskType:"TEST"}));
  assert.ok(omittedNulls.includes("Ваш ответ"));
  assert.ok(!omittedNulls.includes("Отправленный код"));
});

test("history requests are paginated, private, cancellable and detail is fetched separately",async t=>{
  const calls=[];
  const controller=new AbortController();
  t.mock.method(globalThis,"fetch",async(url,options)=>{
    calls.push({url,options});
    return new Response(JSON.stringify({items:[],page:2,hasNext:false}),{status:200});
  });
  await getSubmissionHistory(42,2,controller.signal);
  assert.equal(calls.length,1);
  assert.ok(calls[0].url.endsWith("/api/tasks/42/submissions?page=2"));
  await getSubmissionHistoryDetail(42,"a/b",controller.signal);
  assert.ok(calls[1].url.endsWith("/api/tasks/42/submissions/a%2Fb"));
  for (const call of calls) {
    assert.equal(call.options.signal,controller.signal);
    assert.equal(call.options.cache,"no-store");
  }
});
