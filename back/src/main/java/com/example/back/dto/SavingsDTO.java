package com.example.back.dto;

import com.example.back.domain.Savings;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class SavingsDTO {

    public record Request(
            @NotBlank String name,
            BigDecimal amount,
            String color,
            String icon,
            Boolean available
    ) {}

    public record TransferRequest(
            @NotNull UUID accountId,
            @NotNull @Positive BigDecimal amount
    ) {}

    public record Response(
            UUID id,
            String name,
            BigDecimal amount,
            String color,
            String icon,
            boolean available,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static Response from(Savings s) {
            return new Response(s.getId(), s.getName(), s.getAmount(),
                    s.getColor(), s.getIcon(), s.isAvailable(), s.getCreatedAt(), s.getUpdatedAt());
        }
    }
}
