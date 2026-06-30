package com.example.back.dto;

import com.example.back.domain.WishItemStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class WishItemDTO {

    public record Request(
            @NotBlank String name,
            @NotNull @Positive BigDecimal amount,
            String notes
    ) {}

    /** Vincula a compra desejada a uma transação já existente no módulo de finanças */
    public record PurchaseRequest(
            @NotNull UUID transactionId
    ) {}

    public record Response(
            UUID id,
            String name,
            BigDecimal amount,
            String notes,
            WishItemStatus status,
            int waitDays,           // dias da faixa de valor (fixados na criação)
            int penaltyDays,        // dias extras acumulados por punições
            int totalDays,          // waitDays + penaltyDays (tamanho total da espera)
            int remainingDays,      // quanto falta; 0 = liberada para compra
            boolean releasable,     // WAITING com contador zerado
            LocalDate startedAt,
            LocalDate deactivatedAt,
            LocalDate reactivatableAt, // a partir de quando uma desistência pode ser reativada
            boolean reactivatable,     // INACTIVE com a quarentena de 7 dias já cumprida
            UUID transactionId,
            LocalDateTime createdAt
    ) {}
}
