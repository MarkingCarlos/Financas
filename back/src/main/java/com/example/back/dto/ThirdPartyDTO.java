package com.example.back.dto;

import com.example.back.domain.RecurrenceType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ThirdPartyDTO(
        UUID transactionId,
        UUID groupId,
        String description,
        String creditCardName,
        String thirdPartyPerson,
        BigDecimal amountPerInstallment,
        BigDecimal repaymentPerInstallment,
        BigDecimal effectiveCostPerInstallment,
        int totalInstallments,
        int paidInstallments,
        int remainingInstallments,
        BigDecimal totalRemainingRepayment,
        LocalDate nextInstallmentDate,
        RecurrenceType recurrenceType
) {}
