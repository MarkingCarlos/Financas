package com.example.back.repository;

import com.example.back.domain.PluggyConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PluggyConnectionRepository extends JpaRepository<PluggyConnection, UUID> {

    List<PluggyConnection> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<PluggyConnection> findByItemId(String itemId);

    Optional<PluggyConnection> findByIdAndUserId(UUID id, String userId);
}
