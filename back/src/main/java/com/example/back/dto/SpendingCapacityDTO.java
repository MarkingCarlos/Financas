package com.example.back.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Mostra o quanto o usuário realmente pode gastar considerando:
 *   + Saldo em contas bancárias
 *   - Dívida nos cartões de crédito
 *   + Receitas do mês lançadas (date > hoje, sem conta associada)
 *   - Despesas futuras comprometidas (parcelas + assinaturas dos próximos 6 meses)
 *   = Capacidade de gasto real
 */
public record SpendingCapacityDTO(
        BigDecimal bankBalance,              // total em contas bancárias
        BigDecimal creditCardDebt,           // total de dívida nos cartões
        BigDecimal expectedIncome,           // receitas futuras ainda não recebidas
        BigDecimal committedExpenses,        // total de despesas futuras comprometidas
        BigDecimal committedInstallments,    // parcela das despesas que são parcelamentos
        BigDecimal netCurrentBalance,        // bankBalance − creditCardDebt
        BigDecimal spendingCapacity,         // netCurrentBalance + expectedIncome − committedExpenses
        List<PendingIncome> pendingIncomeList  // receitas futuras pendentes (para ação de receber)
) {
    public record PendingIncome(
            UUID id,
            String description,
            BigDecimal amount,
            LocalDate date
    ) {}
}
