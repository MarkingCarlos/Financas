package com.example.back.dto;

import com.example.back.domain.RecurrenceType;
import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class TransactionDTO {

    public record Request(
            @NotNull TransactionType type,
            @NotBlank String description,
            @NotNull @Positive BigDecimal amount,
            @NotNull LocalDate date,
            UUID categoryId,
            /** Obrigatório quando type=EXPENSE e não for cartão */
            UUID accountId,
            /** Preenchido quando a despesa é no cartão */
            UUID creditCardId,
            String notes,
            /** Tipo de recorrência: NONE (padrão), SUBSCRIPTION ou INSTALLMENT */
            RecurrenceType recurrenceType,
            /** Para parcelamento: parcela atual (1-based) */
            Integer installmentNumber,
            /** Para parcelamento: total de parcelas */
            Integer installmentTotal
    ) {}

    public record Response(
            UUID id,
            TransactionType type,
            String description,
            BigDecimal amount,
            LocalDate date,
            UUID categoryId,
            String categoryName,
            String categoryColor,
            UUID accountId,
            String accountName,
            UUID creditCardId,
            String creditCardName,
            String source,
            String notes,
            RecurrenceType recurrenceType,
            UUID recurrenceGroupId,
            Integer installmentNumber,
            Integer installmentTotal,
            LocalDateTime createdAt
    ) {
        public static Response from(Transaction t,
                                    String categoryName, String categoryColor,
                                    String accountName, String creditCardName) {
            return new Response(
                    t.getId(),
                    t.getType(),
                    t.getDescription(),
                    t.getAmount(),
                    t.getDate(),
                    t.getCategoryId(),
                    categoryName,
                    categoryColor,
                    t.getAccountId(),
                    accountName,
                    t.getCreditCardId(),
                    creditCardName,
                    t.getSource().name(),
                    t.getNotes(),
                    t.getRecurrenceType(),
                    t.getRecurrenceGroupId(),
                    t.getInstallmentNumber(),
                    t.getInstallmentTotal(),
                    t.getCreatedAt()
            );
        }
    }

    /** Resumo de despesas futuras agrupadas por mês */
    public record UpcomingMonth(
            int year,
            int month,
            String monthLabel,
            BigDecimal totalExpenses,
            List<UpcomingTransaction> transactions
    ) {}

    public record UpcomingTransaction(
            UUID id,
            String description,
            BigDecimal amount,
            LocalDate date,
            String categoryName,
            String categoryColor,
            String accountName,
            String creditCardName,
            RecurrenceType recurrenceType,
            UUID recurrenceGroupId,
            Integer installmentNumber,
            Integer installmentTotal
    ) {}
}
