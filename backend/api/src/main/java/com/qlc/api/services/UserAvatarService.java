package com.qlc.api.services;

import com.qlc.api.repositories.UserRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Optional;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserAvatarService {
  private static final int MAX_BYTES = 2 * 1024 * 1024;
  private static final int MAX_DIMENSION = 4096;

  private final JdbcTemplate jdbcTemplate;
  private final UserRepository userRepository;

  public UserAvatarService(JdbcTemplate jdbcTemplate, UserRepository userRepository) {
    this.jdbcTemplate = jdbcTemplate;
    this.userRepository = userRepository;
  }

  public void save(Long userId, MultipartFile file) {
    if (file.isEmpty() || file.getSize() > MAX_BYTES) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Выберите изображение размером до 2 МБ");
    }

    byte[] image;
    try {
      image = file.getBytes();
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Не удалось прочитать изображение");
    }

    if (image.length > MAX_BYTES) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Выберите изображение размером до 2 МБ");
    }

    String contentType = validateImage(image);
    if (!userRepository.existsById(userId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
    }

    jdbcTemplate.update("""
        INSERT INTO user_avatars (user_id, content_type, image_data)
        VALUES (?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE
        SET content_type = EXCLUDED.content_type,
            image_data = EXCLUDED.image_data,
            updated_at = CURRENT_TIMESTAMP
        """, userId, contentType, image);
  }

  public Optional<Avatar> findByUserId(Long userId) {
    return jdbcTemplate.query(
        "SELECT content_type, image_data FROM user_avatars WHERE user_id = ?",
        result -> result.next()
            ? Optional.of(new Avatar(result.getString("content_type"), result.getBytes("image_data")))
            : Optional.empty(),
        userId);
  }

  public void delete(Long userId) {
    jdbcTemplate.update("DELETE FROM user_avatars WHERE user_id = ?", userId);
  }

  private String validateImage(byte[] image) {
    try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(image))) {
      if (input == null) {
        throw invalidImage();
      }

      Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) {
        throw invalidImage();
      }

      ImageReader reader = readers.next();
      try {
        String format = reader.getFormatName();
        String contentType = switch (format.toLowerCase(java.util.Locale.ROOT)) {
          case "jpeg", "jpg" -> "image/jpeg";
          case "png" -> "image/png";
          default -> throw invalidImage();
        };
        reader.setInput(input);
        int width = reader.getWidth(0);
        int height = reader.getHeight(0);
        if (width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
          throw invalidImage();
        }
        return contentType;
      } finally {
        reader.dispose();
      }
    } catch (IOException | RuntimeException exception) {
      if (exception instanceof ResponseStatusException responseStatus) {
        throw responseStatus;
      }
      throw invalidImage();
    }
  }

  private ResponseStatusException invalidImage() {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST,
        "Загрузите корректное изображение JPG или PNG размером не больше 4096 × 4096 пикселей");
  }

  public record Avatar(String contentType, byte[] image) {
  }
}
