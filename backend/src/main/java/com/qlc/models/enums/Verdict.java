package com.qlc.models.enums;

public enum Verdict {
  AC, // Accepted (Решение полностью верное)
  WA, // Wrong Answer (Неверный ответ на одном из тестов)
  CE, // Compilation Error (Ошибка компиляции)
  TLE, // Time Limit Exceeded (Превышено время выполнения)
  MLE, // Memory Limit Exceeded (Превышено ограничение по памяти)
  RE, // Runtime Error (Ошибка во время выполнения, например Segmentation Fault)
  OLE // Output Limit Exceeded (Программа сгенерировала слишком много логов/аутпута)
}
