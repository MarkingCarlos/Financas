package com.example.back.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Detector de inflação de estilo de vida.
 *
 * Compara o crescimento das despesas com o crescimento da renda ao longo dos meses.
 * Quando os gastos crescem tão rápido (ou mais) que a renda, os aumentos estão sendo
 * absorvidos pelo padrão de vida e a taxa de poupança não melhora — a armadilha de
 * "mover a meta para cima" descrita em "A Psicologia Financeira" (Morgan Housel).
 *
 * Metodologia: média dos últimos 3 meses COMPLETOS (janela recente) comparada à média
 * dos até 6 meses anteriores a eles (janela base). O mês corrente fica de fora por
 * estar incompleto. Percentuais em pontos, ex.: 12.5 = 12,5%.
 */
public record LifestyleInflationDTO(
        Status status,
        BigDecimal incomeGrowthPct,      // crescimento % da renda média (recente vs. base)
        BigDecimal expenseGrowthPct,     // crescimento % das despesas médias (recente vs. base)
        BigDecimal recentSavingsRate,    // % da renda poupada na janela recente
        BigDecimal baselineSavingsRate,  // % da renda poupada na janela base
        String insight,                  // mensagem comportamental exibida ao usuário
        List<MonthlySnapshot> history    // histórico mensal (mais antigo -> mais recente) para o gráfico
) {
    public enum Status {
        HEALTHY,            // renda crescendo claramente mais que os gastos
        ATTENTION,          // gastos acompanhando a renda no mesmo ritmo
        INFLATED,           // gastos crescendo mais rápido que a renda
        INSUFFICIENT_DATA   // histórico curto demais para detectar tendência
    }

    public record MonthlySnapshot(
            int year,
            int month,
            String label,            // ex.: "jan/25"
            BigDecimal income,
            BigDecimal expenses,
            BigDecimal savingsRate   // null quando não houve renda no mês
    ) {}
}
