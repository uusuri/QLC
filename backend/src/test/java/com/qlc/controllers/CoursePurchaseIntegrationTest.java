package com.qlc.controllers;

import tools.jackson.databind.ObjectMapper;
import com.qlc.models.dtos.CourseDTO;
import com.qlc.models.dtos.LessonDTO;
import com.qlc.models.dtos.ModuleDTO;
import com.qlc.models.responses.LessonLearnResponse;
import com.qlc.models.entities.Course;
import com.qlc.models.entities.User;
import com.qlc.models.requests.AuthRegisterRequest;
import com.qlc.models.requests.AddToCartRequest;
import com.qlc.models.responses.AuthResponse;
import com.qlc.repositories.CourseRepository;
import com.qlc.repositories.LessonRepository;
import com.qlc.repositories.ModuleRepository;
import com.qlc.repositories.UserRepository;
import com.qlc.services.CartService;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CoursePurchaseIntegrationTest {

  private MockMvc mockMvc;

  @Autowired
  private WebApplicationContext webApplicationContext;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private CourseRepository courseRepository;

  @Autowired
  private ModuleRepository moduleRepository;

  @Autowired
  private LessonRepository lessonRepository;

  @Autowired
  private CartService cartService;

  @Autowired
  private PasswordEncoder passwordEncoder;

  @BeforeEach
  void setup() {
    SecurityContextHolder.clearContext();
    mockMvc = MockMvcBuilders
        .webAppContextSetup(webApplicationContext)
        .apply(springSecurity())
        .build();
    cartService.clear(0L);
    userRepository.deleteAll();
    lessonRepository.deleteAll();
    moduleRepository.deleteAll();
    courseRepository.deleteAll();
  }

  @AfterEach
  void teardown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void courseIsLockedUntilPurchased_thenOpensAndLinksUserAndCourse() throws Exception {
    // === Arrange: create a paid course with a published lesson ===
    Course course = new Course();
    course.setName("Backend Integration");
    course.setDescription("Course purchase flow");
    course.setPrice(BigDecimal.valueOf(4900));
    course.setPriceInStars(BigDecimal.valueOf(100));
    course = courseRepository.save(course);

    com.qlc.models.entities.Module module = new com.qlc.models.entities.Module();
    module.setName("Module 1");
    module.setDescription("First module");
    module.setPosition(0);
    module.setCourse(course);
    module = moduleRepository.save(module);

    com.qlc.models.entities.Lesson lesson = new com.qlc.models.entities.Lesson();
    lesson.setName("Lesson 1");
    lesson.setDescription("First lesson");
    lesson.setPosition(0);
    lesson.setPublished(true);
    lesson.setContentMd("# Secret content");
    lesson.setModule(module);
    lesson = lessonRepository.save(lesson);

    // === Register and login a buyer ===
    String token = registerAndGetToken("buyer01", "buyer01@example.com", "password123");

    // === Assert (a): lesson content is hidden before purchase ===
    MvcResult beforeResult = mockMvc.perform(get("/api/lessons/{id}/learn", lesson.getId())
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();

    LessonLearnResponse beforeResponse = objectMapper.readValue(
        beforeResult.getResponse().getContentAsString(), LessonLearnResponse.class);
    LessonDTO beforeLesson = beforeResponse.lesson();

    assertThat(beforeLesson.contentMd()).isNull();
    assertThat(beforeResponse.tasks()).isEmpty();

    // === Act: add course to cart, then mock checkout ===
    AddToCartRequest addRequest = new AddToCartRequest(course.getId());

    mockMvc.perform(post("/api/cart/items")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(addRequest)))
        .andExpect(status().isOk());

    MvcResult checkoutResult = mockMvc.perform(post("/api/purchase/checkout")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();

    List<CourseDTO> purchased = objectMapper.readValue(
        checkoutResult.getResponse().getContentAsString(),
        objectMapper.getTypeFactory().constructCollectionType(List.class, CourseDTO.class));

    assertThat(purchased).hasSize(1);
    assertThat(purchased.get(0).id()).isEqualTo(course.getId());

    // === Assert (b): lesson content is visible after purchase ===
    MvcResult afterResult = mockMvc.perform(get("/api/lessons/{id}/learn", lesson.getId())
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();

    LessonLearnResponse afterResponse = objectMapper.readValue(
        afterResult.getResponse().getContentAsString(), LessonLearnResponse.class);
    LessonDTO afterLesson = afterResponse.lesson();

    assertThat(afterLesson.contentMd()).isEqualTo("# Secret content");

    // === Assert (c): user's bought courses list contains the course ===
    MvcResult myCoursesResult = mockMvc.perform(get("/api/users/me/courses")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();

    List<CourseDTO> myCourses = objectMapper.readValue(
        myCoursesResult.getResponse().getContentAsString(),
        objectMapper.getTypeFactory().constructCollectionType(List.class, CourseDTO.class));

    assertThat(myCourses).extracting(CourseDTO::id).containsExactly(course.getId());

    // === Assert (d): course now has the buyer as its first student ===
    User user = userRepository.findByUsername("buyer01").orElseThrow();
    Course updatedCourse = courseRepository.findById(course.getId()).orElseThrow();

    assertThat(updatedCourse.getStudents()).hasSize(1);
    assertThat(updatedCourse.getStudents()).extracting(User::getId).containsExactly(user.getId());
    assertThat(user.getBoughtCourses()).extracting(Course::getId).containsExactly(course.getId());
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
