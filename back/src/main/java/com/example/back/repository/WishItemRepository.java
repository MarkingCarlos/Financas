package com.example.back.repository;

import com.example.back.domain.WishItem;
import com.example.back.domain.WishItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WishItemRepository extends JpaRepository<WishItem, UUID> {

    Optional<WishItem> findByIdAndUserId(UUID id, UUID userId);

    List<WishItem> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Itens com contador correndo — alvo das punições globais */
    List<WishItem> findByUserIdAndStatus(UUID userId, WishItemStatus status);
}
