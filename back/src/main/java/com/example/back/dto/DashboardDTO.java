package com.example.back.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardDTO(
        BigDecimal totalBalance,
        BigDecimal totalCreditCardBalance,
        BigDecimal totalSavings,
        BigDecimal incomeCurrentMonth,
        BigDecimal expensesCurrentMonth,
        List<CategoryExpense> expensesByCategory,
        List<TransactionDTO.Response> recentTransactions
) {
    public record CategoryExpense(
            String categoryId,
            String categoryName,
            String categoryColor,
            BigDecimal total
    ) {}
}
