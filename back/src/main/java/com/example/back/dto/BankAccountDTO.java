package com.example.back.dto;

import com.example.back.domain.BankAccount;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class BankAccountDTO {

    public record Request(
            @NotBlank String name,
            String accountNumber,
            BigDecimal balance,
            @NotNull String accountType
    ) {}

    public record Response(
            UUID id,
            String name,
            String accountNumber,
            BigDecimal balance,
            String accountType,
            String pluggyAccountId,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static Response from(BankAccount account) {
            return new Response(
                    account.getId(),
                    account.getName(),
                    account.getAccountNumber(),
                    account.getBalance(),
                    account.getAccountType(),
                    account.getPluggyAccountId(),
                    account.getCreatedAt(),
                    account.getUpdatedAt()
            );
        }
    }
}
