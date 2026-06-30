package com.example.back.dto;

import com.example.back.domain.Bill;
import com.example.back.domain.BillStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class BillDTO {

    public record Response(
            UUID id,
            UUID creditCardId,
            int mes,
            int ano,
            BillStatus status,
            LocalDate fechadoEm,
            BigDecimal balance,
            LocalDateTime criadoEm
    ) {
        public static Response from(Bill bill, BigDecimal balance) {
            return new Response(
                    bill.getId(), bill.getCreditCardId(),
                    bill.getMes(), bill.getAno(),
                    bill.getStatus(), bill.getFechadoEm(),
                    balance, bill.getCriadoEm()
            );
        }
    }

    public record PayRequest(
            @NotNull UUID accountId,
            @NotNull @Positive BigDecimal amount,
            @NotNull LocalDate date
    ) {}
}
