package com.qlc.controllers;

import com.qlc.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.submissions.worker.enabled=false")
@ActiveProfiles("test")
@Import(ApiErrorIntegrationTest.ErrorProbe.class)
class ApiErrorIntegrationTest {
  @Autowired WebApplicationContext context;
  private MockMvc mvc;

  @BeforeEach
  void setup() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  }

  @Test
  void missingResourceAndInvalidPathReturnUsefulClientErrors() throws Exception {
    mvc.perform(get("/api/courses/9223372036854775807"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        .andExpect(jsonPath("$.message").value("Course not found"))
        .andExpect(jsonPath("$.traceId").isNotEmpty());
    mvc.perform(get("/api/courses/not-a-number"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    mvc.perform(get("/api/no-such-route"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  void validationReturnsFieldMessagesWithoutSubmittedPassword() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"a\",\"email\":\"bad\",\"password\":\"secret\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.fieldErrors.username").isNotEmpty())
        .andExpect(jsonPath("$.fieldErrors.email").isNotEmpty())
        .andExpect(jsonPath("$.fieldErrors.password").isNotEmpty())
        .andExpect(content().string(not(containsString("secret"))));
  }

  @Test
  void malformedJsonAndWrongHttpMethodKeepTheirStatuses() throws Exception {
    mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{bad"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    mvc.perform(get("/api/auth/register"))
        .andExpect(status().isMethodNotAllowed())
        .andExpect(header().exists("Allow"))
        .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
  }

  @Test
  void securityFilterAndMethodSecurityBothReturnJson() throws Exception {
    mvc.perform(get("/api/tasks/1"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    mvc.perform(get("/api/tasks/1").with(user(
            UserDetailsImpl.fromToken(1L, "learner", "learner@example.com", "ROLE_USER"))))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void unexpectedAndDatabaseErrorsDoNotExposeInternalDetails() throws Exception {
    mvc.perform(get("/api/test-errors/unexpected"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
        .andExpect(jsonPath("$.traceId").isNotEmpty())
        .andExpect(content().string(not(containsString("private-detail"))));
    mvc.perform(get("/api/test-errors/conflict"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CONFLICT"))
        .andExpect(content().string(not(containsString("private-detail"))));
  }

  @RestController
  static class ErrorProbe {
    @GetMapping("/api/test-errors/unexpected")
    String unexpected() { throw new IllegalStateException("private-detail"); }

    @GetMapping("/api/test-errors/conflict")
    String conflict() { throw new DataIntegrityViolationException("private-detail"); }
  }
}
