package com.example.back.dto;

import com.example.back.domain.CreditCard;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class CreditCardDTO {

    public record Request(
            @NotBlank String name,
            String bankName,
            @Size(max = 4) String lastFourDigits,
            BigDecimal creditLimit,
            BigDecimal currentBalance,
            Integer billMonth,
            Integer billYear,
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Cor deve ser um hex válido (#RRGGBB)") String color
    ) {}

    public record Response(
            UUID id,
            String name,
            String bankName,
            String lastFourDigits,
            BigDecimal creditLimit,
            BigDecimal currentBalance,
            String pluggyAccountId,
            String color,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<BillDTO.Response> bills
    ) {
        public static Response from(CreditCard card, List<BillDTO.Response> bills) {
            return new Response(
                    card.getId(),
                    card.getName(),
                    card.getBankName(),
                    card.getLastFourDigits(),
                    card.getCreditLimit(),
                    card.getCurrentBalance(),
                    card.getPluggyAccountId(),
                    card.getColor(),
                    card.getCreatedAt(),
                    card.getUpdatedAt(),
                    bills
            );
        }
    }
}
