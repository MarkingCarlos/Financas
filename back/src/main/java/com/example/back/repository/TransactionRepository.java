package com.example.back.repository;

import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByIdAndUserId(UUID id, UUID userId);

    Page<Transaction> findByUserIdOrderByDateDescCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Transaction> findByUserIdAndTypeOrderByDateDescCreatedAtDesc(UUID userId, TransactionType type, Pageable pageable);

    Page<Transaction> findByUserIdAndDateBetweenOrderByDateDescCreatedAtDesc(
            UUID userId, LocalDate from, LocalDate to, Pageable pageable);

    Page<Transaction> findByUserIdAndAccountIdOrderByDateDescCreatedAtDesc(UUID userId, UUID accountId, Pageable pageable);

    Page<Transaction> findByUserIdAndCreditCardIdOrderByDateDescCreatedAtDesc(UUID userId, UUID creditCardId, Pageable pageable);

    Page<Transaction> findByUserIdAndCategoryIdOrderByDateDescCreatedAtDesc(UUID userId, UUID categoryId, Pageable pageable);

    Page<Transaction> findByUserIdAndCategoryIdIsNullOrderByDateDescCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "ORDER BY t.date DESC, t.createdAt DESC")
    Page<Transaction> searchByDescription(UUID userId, String search, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.type = :type " +
           "AND LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "ORDER BY t.date DESC, t.createdAt DESC")
    Page<Transaction> searchByDescriptionAndType(UUID userId, String search, TransactionType type, Pageable pageable);

    boolean existsByPluggyTransactionId(String pluggyTransactionId);

    List<Transaction> findByRecurrenceGroupIdAndUserIdAndDateAfter(UUID recurrenceGroupId, UUID userId, LocalDate after);

    List<Transaction> findByRecurrenceGroupIdAndUserIdOrderByDateAsc(UUID recurrenceGroupId, UUID userId);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.type = 'EXPENSE' AND t.date > :from AND t.date <= :to ORDER BY t.date ASC")
    List<Transaction> findUpcomingExpenses(UUID userId, LocalDate from, LocalDate to);

    @Query("""
            SELECT t.categoryId, SUM(t.amount)
            FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = 'EXPENSE'
              AND t.date BETWEEN :from AND :to
            GROUP BY t.categoryId
            """)
    List<Object[]> sumExpensesByCategoryAndPeriod(UUID userId, LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId AND t.type = 'INCOME' AND t.date BETWEEN :from AND :to")
    BigDecimal sumIncomeByPeriod(UUID userId, LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId AND t.type = 'EXPENSE' AND t.date BETWEEN :from AND :to")
    BigDecimal sumExpensesByPeriod(UUID userId, LocalDate from, LocalDate to);

    /** Soma de receitas ainda não recebidas (accountId nulo = não associada a nenhuma conta) */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId AND t.type = 'INCOME' AND t.accountId IS NULL")
    BigDecimal sumPendingIncome(UUID userId);

    /** Soma de despesas comprometidas no futuro (parcelas + assinaturas, até :to) */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId AND t.type = 'EXPENSE' AND t.date > :from AND t.date <= :to")
    BigDecimal sumFutureExpenses(UUID userId, LocalDate from, LocalDate to);

    /** Soma apenas das parcelas futuras (recurrenceType = INSTALLMENT) */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :userId AND t.type = 'EXPENSE' AND t.recurrenceType = 'INSTALLMENT' AND t.date > :from AND t.date <= :to")
    BigDecimal sumFutureInstallments(UUID userId, LocalDate from, LocalDate to);

    /** Lista de receitas pendentes (accountId nulo = ainda não recebidas em nenhuma conta) */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.type = 'INCOME' AND t.accountId IS NULL ORDER BY t.date ASC")
    List<Transaction> findPendingIncome(UUID userId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.faturaId = :faturaId AND t.type = 'EXPENSE'")
    BigDecimal sumExpensesByFaturaId(@Param("faturaId") UUID faturaId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.creditCardId = :creditCardId AND t.type = 'EXPENSE' " +
           "AND t.date >= :startDate AND t.date < :endDate")
    BigDecimal sumExpensesByCreditCardAndDateRange(@Param("creditCardId") UUID creditCardId,
                                                   @Param("startDate") LocalDate startDate,
                                                   @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.creditCardId = :creditCardId AND t.type = 'EXPENSE' " +
           "AND t.recurrenceType <> 'SUBSCRIPTION' " +
           "AND t.date >= :startDate AND t.date < :endDate")
    BigDecimal sumNonSubscriptionExpensesByCreditCardAndDateRange(@Param("creditCardId") UUID creditCardId,
                                                                  @Param("startDate") LocalDate startDate,
                                                                  @Param("endDate") LocalDate endDate);

    List<Transaction> findByUserIdAndThirdPartyTrueOrderByDateAsc(UUID userId);

    /** Soma do valor coberto por terceiros no período: min(amount, thirdPartyAmount) por transação */
    @Query("""
            SELECT COALESCE(SUM(
                CASE WHEN t.thirdPartyAmount <= t.amount THEN t.thirdPartyAmount ELSE t.amount END
            ), 0)
            FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = 'EXPENSE'
              AND t.thirdParty = true
              AND t.thirdPartyAmount IS NOT NULL
              AND t.date BETWEEN :from AND :to
            """)
    BigDecimal sumThirdPartyCoveredByPeriod(@Param("userId") UUID userId,
                                            @Param("from") LocalDate from,
                                            @Param("to") LocalDate to);

    /**
     * Totais mensais de receitas e despesas no período (uma linha por mês/tipo).
     * Usado pelo detector de inflação de estilo de vida para analisar tendências.
     */
    @Query("""
            SELECT YEAR(t.date), MONTH(t.date), t.type, SUM(t.amount)
            FROM Transaction t
            WHERE t.userId = :userId
              AND t.date BETWEEN :from AND :to
            GROUP BY YEAR(t.date), MONTH(t.date), t.type
            ORDER BY YEAR(t.date), MONTH(t.date)
            """)
    List<Object[]> sumMonthlyTotalsByType(UUID userId, LocalDate from, LocalDate to);
}
