package com.example.back.repository;

import com.example.back.domain.Savings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavingsRepository extends JpaRepository<Savings, UUID> {

    List<Savings> findByUserIdOrderByNameAsc(String userId);

    Optional<Savings> findByIdAndUserId(UUID id, String userId);
}
