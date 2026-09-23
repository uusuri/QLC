package com.qlc.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

import com.qlc.models.entities.Course;
import com.qlc.models.dtos.CourseCatalogDTO;
import com.qlc.models.dtos.CourseDTO;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
  Optional<Course> findByName(String name);
  List<Course> findAllByPublishedTrue();
  Optional<Course> findByIdAndPublishedTrue(Long id);

  boolean existsByIdAndStudents_Id(Long courseId, Long userId);

  @Query("select new com.qlc.models.dtos.CourseCatalogDTO("
      + "course.id, course.name, course.description, course.price, course.priceInStars, count(lesson.id)) "
      + "from Course course "
      + "left join course.modules module "
      + "left join module.lessons lesson on lesson.published = true "
      + "where course.published = true "
      + "group by course.id, course.name, course.description, course.price, course.priceInStars "
      + "order by course.id")
  List<CourseCatalogDTO> findPublishedCatalog();

  @Query("select course from Course course join course.students student "
      + "where student.id = :userId order by course.id")
  List<Course> findPurchasedByUserId(@Param("userId") Long userId);

  @Query("select new com.qlc.models.dtos.CourseDTO("
      + "course.id, course.name, course.description, course.price, course.priceInStars) "
      + "from Course course join course.students student "
      + "where student.id = :userId order by course.id")
  List<CourseDTO> findPurchasedDtosByUserId(@Param("userId") Long userId);
}
