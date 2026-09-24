package com.qlc.controllers;

import com.qlc.exceptions.ResourceNotFoundException;
import com.qlc.models.dtos.ErrorDTO;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<Object> notFound(ResourceNotFoundException exception) {
    return error(HttpStatus.NOT_FOUND, exception.getMessage());
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Object> badRequest(IllegalArgumentException exception) {
    return error(HttpStatus.BAD_REQUEST, exception.getMessage());
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<Object> constraintViolation(ConstraintViolationException exception) {
    Map<String, String> fields = new LinkedHashMap<>();
    exception.getConstraintViolations().forEach(violation ->
        fields.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
    return validationError(fields, new HttpHeaders());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Object> conflict(DataIntegrityViolationException exception) {
    return error(HttpStatus.CONFLICT, "Data conflicts with an existing record or a related resource");
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<Object> unauthorized(AuthenticationException exception) {
    return error(HttpStatus.UNAUTHORIZED, "Invalid credentials or authentication required");
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<Object> forbidden(AccessDeniedException exception) {
    return error(HttpStatus.FORBIDDEN, "Access denied");
  }

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
      HttpHeaders headers, HttpStatusCode status, WebRequest request) {
    Map<String, String> fields = new LinkedHashMap<>();
    exception.getBindingResult().getFieldErrors().forEach(field ->
        fields.putIfAbsent(field.getField(), field.getDefaultMessage()));
    return validationError(fields, headers);
  }

  // Preserve framework statuses (malformed JSON, invalid path IDs, 404, 405, 415)
  // and headers without returning parser, SQL, or Java exception details.
  @Override
  protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body,
      HttpHeaders headers, HttpStatusCode status, WebRequest request) {
    HttpStatus httpStatus = HttpStatus.resolve(status.value());
    String message = httpStatus == null ? "Request failed" : httpStatus.getReasonPhrase();
    if (exception instanceof ResponseStatusException responseStatus && !status.is5xxServerError()
        && responseStatus.getReason() != null) {
      message = responseStatus.getReason();
    }
    String code = httpStatus == null ? "REQUEST_ERROR" : httpStatus.name();
    return new ResponseEntity<>(ErrorDTO.of(code, message), headers, status);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Object> unexpected(Exception exception) {
    ErrorDTO body = ErrorDTO.of("INTERNAL_SERVER_ERROR", "An internal error occurred. Please try again later.");
    log.error("Unhandled API error; traceId={}", body.traceId(), exception);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }

  private ResponseEntity<Object> error(HttpStatus status, String message) {
    return ResponseEntity.status(status).body(ErrorDTO.of(status.name(), message));
  }

  private ResponseEntity<Object> validationError(Map<String, String> fields, HttpHeaders headers) {
    return new ResponseEntity<>(new ErrorDTO("VALIDATION_ERROR", "Check the request fields",
        UUID.randomUUID().toString(), fields), headers, HttpStatus.BAD_REQUEST);
  }
}
