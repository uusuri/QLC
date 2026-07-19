package com.qlc.controllers;

import com.qlc.models.entities.User;
import com.qlc.models.requests.AuthLoginRequest;
import com.qlc.models.requests.AuthRegisterRequest;
import com.qlc.models.responses.AuthResponse;
import com.qlc.repositories.UserRepository;
import com.qlc.security.JWTCore;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

  private MockMvc mockMvc;

  @Autowired
  private WebApplicationContext webApplicationContext;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @Autowired
  private JWTCore jwtCore;

  @BeforeEach
  void setup() {
    SecurityContextHolder.clearContext();
    mockMvc = MockMvcBuilders
        .webAppContextSetup(webApplicationContext)
        .apply(springSecurity())
        .build();
    userRepository.deleteAll();
  }

  @AfterEach
  void teardown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void register_savesUser_returnsJwtWithUserData() throws Exception {
    AuthRegisterRequest request = new AuthRegisterRequest("runner01", "runner@example.com", "password123");

    MvcResult result = mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andReturn();

    AuthResponse response = objectMapper.readValue(
        result.getResponse().getContentAsString(), AuthResponse.class);

    assertThat(response.accessToken()).isNotBlank();
    assertThat(response.tokenType()).isEqualTo("Bearer");
    assertThat(response.user().username()).isEqualTo("runner01");
    assertThat(response.user().email()).isEqualTo("runner@example.com");
    assertThat(response.user().role()).isEqualTo("ROLE_USER");
    assertThat(response.user().id()).isNotNull();

    User savedUser = userRepository.findByUsername("runner01").orElseThrow();
    assertThat(savedUser.getEmail()).isEqualTo("runner@example.com");
    assertThat(savedUser.getRole().name()).isEqualTo("ROLE_USER");
    assertThat(passwordEncoder.matches("password123", savedUser.getPassword())).isTrue();

    assertThat(jwtCore.extractUsername(response.accessToken())).isEqualTo("runner01");
    assertThat(jwtCore.extractRole(response.accessToken())).isEqualTo("ROLE_USER");
    assertThat(jwtCore.extractUserId(response.accessToken())).isEqualTo(response.user().id());
  }

  @Test
  void login_validCredentials_returnsJwtAndUserInfo() throws Exception {
    registerDirectly("runner02", "runner2@example.com", "password123");

    AuthLoginRequest request = new AuthLoginRequest("runner02", "password123");

    MvcResult result = mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andReturn();

    AuthResponse response = objectMapper.readValue(
        result.getResponse().getContentAsString(), AuthResponse.class);

    assertThat(response.accessToken()).isNotBlank();
    assertThat(response.user().username()).isEqualTo("runner02");
    assertThat(response.user().email()).isEqualTo("runner2@example.com");
  }

  @Test
  void me_withValidToken_returnsCurrentUser() throws Exception {
    String token = registerAndGetToken("runner03", "runner3@example.com", "password123");

    MvcResult result = mockMvc.perform(get("/api/auth/me")
        .header("Authorization", "Bearer " + token))
        .andDo(print())
        .andExpect(status().isOk())
        .andReturn();

    AuthResponse.UserInfo userInfo = objectMapper.readValue(
        result.getResponse().getContentAsString(), AuthResponse.UserInfo.class);

    assertThat(userInfo.username()).isEqualTo("runner03");
    assertThat(userInfo.email()).isEqualTo("runner3@example.com");
    assertThat(userInfo.role()).isEqualTo("ROLE_USER");
    assertThat(userInfo.id()).isNotNull();
  }

  @Test
  void register_duplicateUsername_returnsBadRequest() throws Exception {
    registerDirectly("runner04", "runner4@example.com", "password123");

    AuthRegisterRequest request = new AuthRegisterRequest("runner04", "other@example.com", "password123");

    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void register_duplicateEmail_returnsBadRequest() throws Exception {
    registerDirectly("runner05", "runner5@example.com", "password123");

    AuthRegisterRequest request = new AuthRegisterRequest("runner05a", "runner5@example.com", "password123");

    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void login_invalidCredentials_returnsUnauthorized() throws Exception {
    registerDirectly("runner06", "runner6@example.com", "password123");

    AuthLoginRequest request = new AuthLoginRequest("runner06", "wrong-password");

    mockMvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void me_withoutToken_returnsUnauthorized() throws Exception {
    mockMvc.perform(get("/api/auth/me"))
        .andExpect(status().isUnauthorized());
  }

  private void registerDirectly(String username, String email, String password) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPassword(passwordEncoder.encode(password));
    user.setRole(com.qlc.models.enums.Role.ROLE_USER);
    user.setTgId(System.nanoTime());
    user.setRegistrationDate(java.time.LocalDateTime.now());
    userRepository.save(user);
  }

  private String registerAndGetToken(String username, String email, String password) throws Exception {
    AuthRegisterRequest request = new AuthRegisterRequest(username, email, password);

    MvcResult result = mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andReturn();

    AuthResponse response = objectMapper.readValue(
        result.getResponse().getContentAsString(), AuthResponse.class);

    return response.accessToken();
  }
}
