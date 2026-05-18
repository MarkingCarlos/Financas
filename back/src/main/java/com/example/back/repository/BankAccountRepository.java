package com.example.back.repository;

import com.example.back.domain.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {

    List<BankAccount> findByUserIdOrderByNameAsc(String userId);

    Optional<BankAccount> findByIdAndUserId(UUID id, String userId);

    boolean existsByPluggyAccountId(String pluggyAccountId);

    Optional<BankAccount> findByPluggyAccountId(String pluggyAccountId);
}
