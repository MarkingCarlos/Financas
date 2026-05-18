package com.example.back.repository;

import com.example.back.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    /** Retorna categorias padrão + categorias do usuário */
    @Query("SELECT c FROM Category c WHERE c.userId IS NULL OR c.userId = :userId ORDER BY c.isDefault DESC, c.name ASC")
    List<Category> findAllForUser(String userId);

    Optional<Category> findByIdAndUserId(UUID id, String userId);

    /** Para categorias padrão do sistema */
    List<Category> findByIsDefaultTrue();
}
