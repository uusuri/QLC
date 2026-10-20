import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const baseUrl = 'http://127.0.0.1:8081';
const token = __ENV.QLC_TOKEN;
const mode = __ENV.MODE || 'smoke';
const taskId = 3;
const sourceCode = `#include <iostream>

int main () {
 int a = 5;
 std::cout << a << std::endl;
 return 0;
}`;

if (!token || /\s/.test(token) || token.split('.').length !== 3) {
  throw new Error('Set a valid QLC_TOKEN in your local shell. Do not paste the token into this file.');
}
if (!['smoke', 'load', 'step2', 'stress'].includes(mode)) {
  throw new Error('MODE must be smoke, load, step2, or stress.');
}

const timeToProgress = new Trend('submission_time_to_progress_ms', true);
const timeToVerdict = new Trend('submission_time_to_verdict_ms', true);
const terminalStatuses = new Set(['FINISHED', 'DEMO', 'INFRA_ERROR', 'CANCELLED']);

export const options = {
  scenarios: {
    submissions: mode === 'stress'
      ? {
        executor: 'constant-arrival-rate',
        rate: 5,
        timeUnit: '1s',
        duration: '20s',
        preAllocatedVUs: 40,
        maxVUs: 120,
        gracefulStop: '2m',
      }
      : mode === 'step2'
        ? {
          executor: 'constant-arrival-rate',
          rate: 1,
          timeUnit: '1s',
          duration: '30s',
          preAllocatedVUs: 12,
          maxVUs: 40,
          gracefulStop: '2m',
        }
        : mode === 'load'
          ? {
            executor: 'constant-arrival-rate',
            rate: 1,
            timeUnit: '5s',
            duration: '1m',
            preAllocatedVUs: 4,
            maxVUs: 12,
            gracefulStop: '2m',
          }
          : {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '2m',
          },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    dropped_iterations: ['count==0'],
  },
};

function jsonOrNull(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function responseDiagnostic(response) {
  const body = typeof response.body === 'string' ? response.body.slice(0, 400) : '';
  return `HTTP ${response.status}${body ? `: ${body}` : ''}`;
}

export default function () {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `k6-${Date.now()}-${__VU}-${__ITER}`,
  };
  const startedAt = Date.now();
  const createdResponse = http.post(
    `${baseUrl}/api/tasks/${taskId}/submissions`,
    JSON.stringify({ language: 'CPP23', sourceCode }),
    { headers },
  );
  const created = jsonOrNull(createdResponse);
  const accepted = check(createdResponse, {
    'POST 202 with submission ID': (response) =>
      response.status === 202 && typeof created?.id === 'string',
  });
  if (!accepted) {
    console.error(`Submission creation failed: ${responseDiagnostic(createdResponse)}`);
    return;
  }

  let finalResult = null;
  let progressObserved = false;
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    const response = http.get(`${baseUrl}/api/submissions/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status !== 200) {
      console.error(`Submission polling failed: ${responseDiagnostic(response)}`);
      break;
    }
    const result = jsonOrNull(response);

    if (result && result.status !== 'QUEUED' && !progressObserved) {
      timeToProgress.add(Date.now() - startedAt);
      progressObserved = true;
    }
    if (result && terminalStatuses.has(result.status)) {
      finalResult = result;
      timeToVerdict.add(Date.now() - startedAt);
      break;
    }
    sleep(0.2);
  }

  check(finalResult, {
    'reached FINISHED': (result) => result?.status === 'FINISHED',
    'judge ran the test cases': (result) =>
      result?.verdict === 'AC' || result?.verdict === 'WA',
  });
  console.log(
    `submission=${created.id} status=${finalResult?.status ?? 'TIMEOUT'} ` +
    `verdict=${finalResult?.verdict ?? '-'} elapsed=${Date.now() - startedAt}ms`,
  );
}
