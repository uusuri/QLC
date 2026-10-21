package com.qlc.shared.model.entities;

import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.math.BigDecimal;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.Getter;
import lombok.ToString;

@Entity
@Table(name = "courses")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = { "students", "modules" })
public class Course {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private BigDecimal price;

  @Column(nullable = false, name = "price_in_stars")
  private BigDecimal priceInStars;

  @Column(nullable = false)
  private String description;

  @Column(name = "hidden_content_link", length = 512)
  private String hiddenContentLink;

  @Column(nullable = false)
  private boolean published = true;

  @Column(nullable = false)
  private boolean multilingual = false;

  @ElementCollection
  @CollectionTable(name = "course_languages", joinColumns = @JoinColumn(name = "course_id"))
  @Column(name = "language", nullable = false, length = 32)
  private Set<String> availableLanguages = new java.util.LinkedHashSet<>(Set.of("CPP23"));

  @ManyToMany
  @JoinTable(name = "user_courses", joinColumns = @JoinColumn(name = "course_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
  private Set<User> students = new HashSet<>();

  @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("position ASC")
  private List<Module> modules;
}
