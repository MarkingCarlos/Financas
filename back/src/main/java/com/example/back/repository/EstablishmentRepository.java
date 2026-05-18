package com.example.back.repository;

import com.example.back.domain.Establishment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EstablishmentRepository extends JpaRepository<Establishment, UUID> {
    List<Establishment> findByUserIdOrderByNameAsc(UUID userId);
    Optional<Establishment> findByIdAndUserId(UUID id, UUID userId);
}
