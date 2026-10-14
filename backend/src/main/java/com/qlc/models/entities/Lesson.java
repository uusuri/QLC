package com.qlc.models.entities;

import java.util.List;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lessons")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = { "module", "tasks" })
public class Lesson {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String description;

  @Column(nullable = false)
  private int position = 0;

  @Column(nullable = false)
  private boolean published = true;

  @Column(name = "content_md", columnDefinition = "TEXT")
  private String contentMd;

  @ElementCollection
  @CollectionTable(name = "lesson_theory_variants", joinColumns = @JoinColumn(name = "lesson_id"))
  @MapKeyColumn(name = "language", length = 32)
  @Column(name = "content_md", columnDefinition = "TEXT", nullable = false)
  private java.util.Map<String, String> contentByLanguage = new java.util.HashMap<>();

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "module_id", nullable = false)
  private Module module;

  @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<Task> tasks;
}
