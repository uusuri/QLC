package com.qlc.api.repositories;

import com.qlc.shared.model.entities.AccountEmailToken;
import com.qlc.shared.model.enums.AccountEmailTokenPurpose;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface AccountEmailTokenRepository extends JpaRepository<AccountEmailToken, Long> {
  boolean existsByUserIdAndPurposeAndCreatedAtAfter(Long userId, AccountEmailTokenPurpose purpose,
      LocalDateTime after);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<AccountEmailToken> findByTokenHashAndPurpose(String tokenHash, AccountEmailTokenPurpose purpose);

  long deleteByUserIdAndPurpose(Long userId, AccountEmailTokenPurpose purpose);

  long deleteByExpiresAtBefore(LocalDateTime before);
}
