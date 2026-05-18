package com.example.back.repository;

import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionSource;
import com.example.back.domain.TransactionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class TransactionRepositoryTest {

    @Autowired
    private TransactionRepository repository;

    private static final String USER_ID = "user-test";
    private static final LocalDate HOJE = LocalDate.now();

    @BeforeEach
    void setup() {
        repository.save(transaction(TransactionType.EXPENSE, new BigDecimal("200.00"), HOJE));
        repository.save(transaction(TransactionType.EXPENSE, new BigDecimal("150.00"), HOJE));
        repository.save(transaction(TransactionType.INCOME,  new BigDecimal("3000.00"), HOJE));
    }

    @Test
    void deveSomarDespesasNoPeriodo() {
        BigDecimal total = repository.sumExpensesByPeriod(USER_ID, HOJE.withDayOfMonth(1), HOJE);

        assertThat(total).isEqualByComparingTo("350.00");
    }

    @Test
    void deveSomarReceitasNoPeriodo() {
        BigDecimal total = repository.sumIncomeByPeriod(USER_ID, HOJE.withDayOfMonth(1), HOJE);

        assertThat(total).isEqualByComparingTo("3000.00");
    }

    @Test
    void naoDeveRetornarTransacaoDeOutroUsuario() {
        Transaction outra = transaction(TransactionType.EXPENSE, new BigDecimal("999.00"), HOJE);
        outra.setUserId("outro-usuario");
        repository.save(outra);

        BigDecimal total = repository.sumExpensesByPeriod(USER_ID, HOJE.withDayOfMonth(1), HOJE);

        // 999 não deve entrar no total do USER_ID
        assertThat(total).isEqualByComparingTo("350.00");
    }

    @Test
    void deveEvitarDuplicataPluggy() {
        repository.save(transaction(TransactionType.EXPENSE, new BigDecimal("50.00"), HOJE)
                .toBuilder().pluggyTransactionId("pluggy-tx-001").build());

        assertThat(repository.existsByPluggyTransactionId("pluggy-tx-001")).isTrue();
        assertThat(repository.existsByPluggyTransactionId("pluggy-tx-999")).isFalse();
    }

    private Transaction transaction(TransactionType type, BigDecimal amount, LocalDate date) {
        return Transaction.builder()
                .userId(USER_ID)
                .type(type)
                .description("Teste")
                .amount(amount)
                .date(date)
                .source(TransactionSource.MANUAL)
                .build();
    }
}
