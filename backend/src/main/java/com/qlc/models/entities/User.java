package com.qlc.models.entities;

import com.qlc.models.enums.Role;

import java.util.Set;
import java.util.HashSet;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Getter;

@Entity
@Table(name = "users")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private Long tgId;

  @Column(nullable = false, unique = true)
  private String username;

  @Column(nullable = false)
  private String password;

  @Column(nullable = false, unique = true)
  private String email;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role;

  @ManyToMany
  @JoinTable(name = "user_registration_courses", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "course_id"))
  private Set<Course> selectedOnRegistration = new HashSet<>();

  @ManyToMany(mappedBy = "students")
  private Set<Course> boughtCourses = new HashSet<>();

  @Column(name = "registration_date", nullable = false)
  private LocalDateTime registrationDate;
}
