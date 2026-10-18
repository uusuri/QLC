package com.qlc.controllers;

import com.qlc.models.entities.User;
import com.qlc.models.enums.Role;
import com.qlc.repositories.AccountEmailTokenRepository;
import com.qlc.repositories.UserRepository;
import com.qlc.services.AccountEmailSender;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class AccountEmailFlowIntegrationTest {
  private static final Pattern TOKEN_PATTERN = Pattern.compile("token=([A-Za-z0-9_-]{43})");

  @Autowired WebApplicationContext context;
  @Autowired UserRepository users;
  @Autowired AccountEmailTokenRepository tokens;
  @Autowired PasswordEncoder encoder;
  @MockitoBean AccountEmailSender sender;

  private final ObjectMapper mapper = new ObjectMapper();
  private MockMvc mvc;

  @BeforeEach
  void setup() {
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    tokens.deleteAll();
    users.deleteAll();
    clearInvocations(sender);
  }

  @Test
  void registrationVerificationIsSingleUseAndDoesNotStoreRawToken() throws Exception {
    String response = mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
            {"username":"newuser","email":"new@example.com","password":"password123"}
            """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.user.emailVerified").value(false))
        .andReturn().getResponse().getContentAsString();
    String oldJwt = mapper.readTree(response).get("accessToken").asText();
    String rawToken = sentToken();
    assertThat(tokens.findAll()).hasSize(1);
    assertThat(tokens.findAll().getFirst().getTokenHash()).doesNotContain(rawToken);

    mvc.perform(post("/api/auth/email-verification/confirm")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"token\":\"" + rawToken + "\"}"))
        .andExpect(status().isNoContent());
    assertThat(users.findByUsername("newuser").orElseThrow().isEmailVerified()).isTrue();
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldJwt))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.emailVerified").value(true));
    mvc.perform(post("/api/auth/email-verification/confirm")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"token\":\"" + rawToken + "\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void resetRevokesOldJwtAndTokenCannotBeReused() throws Exception {
    User user = createUser("resetuser", "reset@example.com", true);
    String oldJwt = mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"username\":\"resetuser\",\"password\":\"password123\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    oldJwt = mapper.readTree(oldJwt).get("accessToken").asText();

    mvc.perform(post("/api/auth/password-reset/request")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"reset@example.com\"}"))
        .andExpect(status().isNoContent());
    String rawToken = sentToken();
    mvc.perform(post("/api/auth/password-reset/confirm")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"token\":\"" + rawToken + "\",\"password\":\"new-password-123\"}"))
        .andExpect(status().isNoContent());

    assertThat(encoder.matches("new-password-123", users.findById(user.getId()).orElseThrow().getPassword())).isTrue();
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + oldJwt))
        .andExpect(status().isUnauthorized());
    mvc.perform(post("/api/auth/password-reset/confirm")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"token\":\"" + rawToken + "\",\"password\":\"another-password\"}"))
        .andExpect(status().isBadRequest());
    mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"username\":\"resetuser\",\"password\":\"new-password-123\"}"))
        .andExpect(status().isOk());
  }

  @Test
  void unknownAccountGetsGenericResponseWithoutSendingMail() throws Exception {
    mvc.perform(post("/api/auth/password-reset/request")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"missing@example.com\"}"))
        .andExpect(status().isNoContent());
    verify(sender, never()).send(anyString(), anyString(), anyString());
    assertThat(tokens.count()).isZero();
  }

  @Test
  void resetAlsoWorksForAnUnverifiedExistingAccount() throws Exception {
    User user = createUser("unverified", "unverified@example.com", false);
    mvc.perform(post("/api/auth/password-reset/request")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"unverified@example.com\"}"))
        .andExpect(status().isNoContent());
    String rawToken = sentToken();
    mvc.perform(post("/api/auth/password-reset/confirm")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"token\":\"" + rawToken + "\",\"password\":\"new-password-123\"}"))
        .andExpect(status().isNoContent());
    assertThat(users.findById(user.getId()).orElseThrow().isEmailVerified()).isTrue();
  }

  @Test
  void repeatRequestWithinOneMinuteDoesNotSendAnotherEmail() throws Exception {
    createUser("limited", "limited@example.com", true);
    for (int i = 0; i < 2; i++) {
      mvc.perform(post("/api/auth/password-reset/request")
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"email\":\"limited@example.com\"}"))
          .andExpect(status().isNoContent());
    }
    verify(sender, times(1)).send(anyString(), anyString(), anyString());
  }

  private User createUser(String username, String email, boolean emailVerified) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPassword(encoder.encode("password123"));
    user.setRole(Role.ROLE_USER);
    user.setRegistrationDate(LocalDateTime.now());
    user.setEmailVerified(emailVerified);
    return users.save(user);
  }

  private String sentToken() {
    ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
    verify(sender).send(anyString(), anyString(), body.capture());
    Matcher matcher = TOKEN_PATTERN.matcher(body.getValue());
    assertThat(matcher.find()).isTrue();
    return matcher.group(1);
  }
}
