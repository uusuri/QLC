import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    lesson: {
      executor: 'constant-arrival-rate',
      rate: 1500,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
};

export default function () {
  const response = http.get('http://127.0.0.1:8081/api/lessons/3/learn', {
    headers: { Authorization: `Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwidXNlcklkIjo0LCJlbWFpbCI6ImFkbWluQG1haWwucnUiLCJpYXQiOjE3OTIxNjc3MjQsImV4cCI6MTc5MjI1NDEyNH0.MQLpuP1fmCWhjwPJt0hiKUSaqW19lrXNSxH95XhOND3-QU1hbNv1rJBrpM6cCSX5tds0aPHytQeOZOrr81B_QQ` },
  });

  check(response, {
    'HTTP 200': (r) => r.status === 200,
    'урок доступен': (r) => r.status === 200 && r.json('hasAccess') === true,
  });
} 
