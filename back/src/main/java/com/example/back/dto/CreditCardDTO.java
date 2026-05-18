package com.example.back.dto;

import com.example.back.domain.CreditCard;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class CreditCardDTO {

    public record Request(
            @NotBlank String name,
            String bankName,
            @Size(max = 4) String lastFourDigits,
            BigDecimal creditLimit,
            BigDecimal currentBalance,
            @NotNull @Min(1) @Max(28) Integer closingDay,
            @NotNull @Min(1) @Max(28) Integer dueDay
    ) {}

    public record PaymentRequest(
            @NotNull UUID accountId,
            @NotNull @Positive BigDecimal amount,
            @NotNull java.time.LocalDate date
    ) {}

    public record Response(
            UUID id,
            String name,
            String bankName,
            String lastFourDigits,
            BigDecimal creditLimit,
            BigDecimal currentBalance,
            Integer closingDay,
            Integer dueDay,
            LocalDate nextClosingDate,
            LocalDate nextDueDate,
            String pluggyAccountId,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static Response from(CreditCard card) {
            LocalDate today = LocalDate.now();
            LocalDate closingDate = computeNextDate(today, card.getClosingDay());
            LocalDate dueDate = computeDueDate(closingDate, card.getClosingDay(), card.getDueDay());

            // Garantia absoluta: vencimento nunca pode ser antes do fechamento
            if (!dueDate.isAfter(closingDate)) {
                LocalDate next = closingDate.plusMonths(1);
                dueDate = next.withDayOfMonth(Math.min(card.getDueDay(), next.lengthOfMonth()));
            }

            return new Response(
                    card.getId(),
                    card.getName(),
                    card.getBankName(),
                    card.getLastFourDigits(),
                    card.getCreditLimit(),
                    card.getCurrentBalance(),
                    card.getClosingDay(),
                    card.getDueDay(),
                    closingDate,
                    dueDate,
                    card.getPluggyAccountId(),
                    card.getCreatedAt(),
                    card.getUpdatedAt()
            );
        }

        private static LocalDate computeNextDate(LocalDate today, Integer day) {
            if (day == null) return today.plusMonths(1);
            LocalDate candidate = today.withDayOfMonth(Math.min(day, today.lengthOfMonth()));
            if (!candidate.isAfter(today)) {
                LocalDate next = today.plusMonths(1);
                candidate = next.withDayOfMonth(Math.min(day, next.lengthOfMonth()));
            }
            return candidate;
        }

        // Se o dia de fechamento for maior que o dia de vencimento, o pagamento é no mês seguinte ao fechamento
        private static LocalDate computeDueDate(LocalDate closingDate, Integer closingDay, Integer dueDay) {
            if (dueDay == null) return closingDate.plusMonths(1);
            if (closingDay != null && closingDay > dueDay) {
                LocalDate next = closingDate.plusMonths(1);
                return next.withDayOfMonth(Math.min(dueDay, next.lengthOfMonth()));
            }
            return closingDate.withDayOfMonth(Math.min(dueDay, closingDate.lengthOfMonth()));
        }
    }
}
