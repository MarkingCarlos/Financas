package com.example.back.repository;

import com.example.back.domain.CreditCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreditCardRepository extends JpaRepository<CreditCard, UUID> {

    List<CreditCard> findByUserIdOrderByNameAsc(String userId);

    Optional<CreditCard> findByIdAndUserId(UUID id, String userId);

    boolean existsByPluggyAccountId(String pluggyAccountId);

    Optional<CreditCard> findByPluggyAccountId(String pluggyAccountId);
}
