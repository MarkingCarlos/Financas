package com.example.back.service;

import com.example.back.domain.RecurrenceType;
import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionType;
import com.example.back.dto.DashboardDTO;
import com.example.back.dto.SpendingCapacityDTO;
import com.example.back.dto.TransactionDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.BankAccountRepository;
import com.example.back.repository.CategoryRepository;
import com.example.back.repository.CreditCardRepository;
import com.example.back.repository.SavingsRepository;
import com.example.back.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final BankAccountRepository bankAccountRepository;
    private final CreditCardRepository creditCardRepository;
    private final SavingsRepository savingsRepository;
    private final UserService userService;

    public Page<TransactionDTO.Response> findAll(String googleId, Pageable pageable) {
        return transactionRepository
                .findByUserIdOrderByDateDescCreatedAtDesc(uid(googleId), pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findByType(String googleId, TransactionType type, Pageable pageable) {
        return transactionRepository
                .findByUserIdAndTypeOrderByDateDescCreatedAtDesc(uid(googleId), type, pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findByPeriod(String googleId, LocalDate from, LocalDate to, Pageable pageable) {
        return transactionRepository
                .findByUserIdAndDateBetweenOrderByDateDescCreatedAtDesc(uid(googleId), from, to, pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findByAccount(String googleId, UUID accountId, Pageable pageable) {
        return transactionRepository
                .findByUserIdAndAccountIdOrderByDateDescCreatedAtDesc(uid(googleId), accountId, pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findByCard(String googleId, UUID cardId, Pageable pageable) {
        return transactionRepository
                .findByUserIdAndCreditCardIdOrderByDateDescCreatedAtDesc(uid(googleId), cardId, pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findByCategory(String googleId, UUID categoryId, Pageable pageable) {
        return transactionRepository
                .findByUserIdAndCategoryIdOrderByDateDescCreatedAtDesc(uid(googleId), categoryId, pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findByNullCategory(String googleId, Pageable pageable) {
        return transactionRepository
                .findByUserIdAndCategoryIdIsNullOrderByDateDescCreatedAtDesc(uid(googleId), pageable)
                .map(this::toResponse);
    }

    public Page<TransactionDTO.Response> findBySearch(String googleId, String search, TransactionType type, Pageable pageable) {
        UUID uid = uid(googleId);
        if (type != null) {
            return transactionRepository.searchByDescriptionAndType(uid, search, type, pageable).map(this::toResponse);
        }
        return transactionRepository.searchByDescription(uid, search, pageable).map(this::toResponse);
    }

    public List<TransactionDTO.Response> findByGroup(UUID groupId, String googleId) {
        return transactionRepository
                .findByRecurrenceGroupIdAndUserIdOrderByDateAsc(groupId, uid(googleId))
                .stream().map(this::toResponse).toList();
    }

    public TransactionDTO.Response findById(UUID id, String googleId) {
        return toResponse(getOwned(id, uid(googleId)));
    }

    @Transactional
    public TransactionDTO.Response create(TransactionDTO.Request request, String googleId) {
        UUID userId = uid(googleId);
        validateTransactionRequest(request, googleId);

        RecurrenceType recurrenceType = request.recurrenceType() != null
                ? request.recurrenceType() : RecurrenceType.NONE;

        if (recurrenceType == RecurrenceType.SUBSCRIPTION) {
            return createSubscription(request, userId);
        }
        if (recurrenceType == RecurrenceType.INSTALLMENT) {
            return createInstallments(request, userId);
        }

        Transaction saved = saveOne(request, userId, null, RecurrenceType.NONE, null, null, request.date());
        return toResponse(saved);
    }

    private TransactionDTO.Response createSubscription(TransactionDTO.Request request, UUID userId) {
        UUID groupId = UUID.randomUUID();
        Transaction first = null;
        for (int i = 0; i < 24; i++) {
            LocalDate date = request.date().plusMonths(i);
            Transaction saved = saveOne(request, userId, groupId, RecurrenceType.SUBSCRIPTION, null, null, date);
            if (i == 0) first = saved;
        }
        return toResponse(first);
    }

    private TransactionDTO.Response createInstallments(TransactionDTO.Request request, UUID userId) {
        int startNum = request.installmentNumber() != null ? request.installmentNumber() : 1;
        int total = request.installmentTotal() != null ? request.installmentTotal() : 1;
        UUID groupId = UUID.randomUUID();
        Transaction first = null;
        for (int i = 0; i < (total - startNum + 1); i++) {
            LocalDate date = request.date().plusMonths(i);
            int num = startNum + i;
            Transaction saved = saveOne(request, userId, groupId, RecurrenceType.INSTALLMENT, num, total, date);
            if (i == 0) first = saved;
        }
        return toResponse(first);
    }

    private Transaction saveOne(TransactionDTO.Request req, UUID userId,
                                UUID groupId, RecurrenceType recurrenceType,
                                Integer installmentNumber, Integer installmentTotal,
                                LocalDate date) {
        Transaction t = Transaction.builder()
                .userId(userId)
                .type(req.type())
                .description(req.description())
                .amount(req.amount())
                .date(date)
                .categoryId(req.categoryId())
                .accountId(req.accountId())
                .creditCardId(req.creditCardId())
                .notes(req.notes())
                .recurrenceType(recurrenceType)
                .recurrenceGroupId(groupId)
                .installmentNumber(installmentNumber)
                .installmentTotal(installmentTotal)
                .build();
        Transaction saved = transactionRepository.save(t);
        updateBalances(saved, BigDecimal.ZERO, saved.getAmount());
        return saved;
    }

    @Transactional
    public TransactionDTO.Response update(UUID id, TransactionDTO.Request request, String googleId) {
        UUID userId = uid(googleId);
        Transaction transaction = getOwned(id, userId);
        BigDecimal oldAmount = transaction.getAmount();

        validateTransactionRequest(request, googleId);
        transaction.setType(request.type());
        transaction.setDescription(request.description());
        transaction.setAmount(request.amount());
        transaction.setDate(request.date());
        transaction.setCategoryId(request.categoryId());
        transaction.setAccountId(request.accountId());
        transaction.setCreditCardId(request.creditCardId());
        transaction.setNotes(request.notes());

        Transaction saved = transactionRepository.save(transaction);
        updateBalances(saved, oldAmount, saved.getAmount());
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id, String googleId) {
        Transaction transaction = getOwned(id, uid(googleId));
        updateBalances(transaction, transaction.getAmount(), BigDecimal.ZERO);
        transactionRepository.delete(transaction);
    }

    @Transactional
    public void cancelSubscriptionGroup(UUID groupId, String googleId) {
        UUID userId = uid(googleId);
        LocalDate today = LocalDate.now();
        List<Transaction> future = transactionRepository
                .findByRecurrenceGroupIdAndUserIdAndDateAfter(groupId, userId, today);
        for (Transaction t : future) {
            updateBalances(t, t.getAmount(), BigDecimal.ZERO);
            transactionRepository.delete(t);
        }
    }

    public List<TransactionDTO.UpcomingMonth> getUpcoming(String googleId) {
        UUID userId = uid(googleId);
        LocalDate today = LocalDate.now();
        LocalDate sixMonthsLater = today.plusMonths(6);

        List<Transaction> upcoming = transactionRepository.findUpcomingExpenses(userId, today, sixMonthsLater);

        Map<String, List<Transaction>> grouped = new LinkedHashMap<>();
        for (Transaction t : upcoming) {
            String key = t.getDate().getYear() + "-" + String.format("%02d", t.getDate().getMonthValue());
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(t);
        }

        List<TransactionDTO.UpcomingMonth> result = new ArrayList<>();
        for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {
            List<Transaction> txs = entry.getValue();
            int year = txs.get(0).getDate().getYear();
            int month = txs.get(0).getDate().getMonthValue();
            String label = Month.of(month).getDisplayName(TextStyle.FULL, new Locale("pt", "BR")) + "/" + year;
            BigDecimal total = txs.stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            List<TransactionDTO.UpcomingTransaction> items = txs.stream().map(t -> {
                String catName = null, catColor = null, accName = null, cardName = null;
                if (t.getCategoryId() != null) {
                    var cat = categoryRepository.findById(t.getCategoryId());
                    catName = cat.map(c -> c.getName()).orElse(null);
                    catColor = cat.map(c -> c.getColor()).orElse(null);
                }
                if (t.getAccountId() != null)
                    accName = bankAccountRepository.findById(t.getAccountId()).map(a -> a.getName()).orElse(null);
                if (t.getCreditCardId() != null)
                    cardName = creditCardRepository.findById(t.getCreditCardId()).map(c -> c.getName()).orElse(null);
                return new TransactionDTO.UpcomingTransaction(
                        t.getId(), t.getDescription(), t.getAmount(), t.getDate(),
                        catName, catColor, accName, cardName,
                        t.getRecurrenceType(), t.getRecurrenceGroupId(),
                        t.getInstallmentNumber(), t.getInstallmentTotal());
            }).toList();

            result.add(new TransactionDTO.UpcomingMonth(year, month, label, total, items));
        }
        return result;
    }

    /**
     * Calcula o poder de compra real do usuário:
     *   contas - cartões + receitas do mês não recebidas - despesas comprometidas
     */
    public SpendingCapacityDTO getSpendingCapacity(String googleId) {
        UUID userId = uid(googleId);
        LocalDate today = LocalDate.now();
        LocalDate sixMonthsLater = today.plusMonths(6);

        BigDecimal bankBalance = bankAccountRepository.findByUserIdOrderByNameAsc(googleId)
                .stream().map(a -> a.getBalance()).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal creditCardDebt = creditCardRepository.findByUserIdOrderByNameAsc(googleId)
                .stream().map(c -> c.getCurrentBalance()).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Receitas ainda não recebidas (sem conta associada), independente da data
        BigDecimal expectedIncome = transactionRepository.sumPendingIncome(userId);

        BigDecimal committedExpenses = transactionRepository.sumFutureExpenses(userId, today, sixMonthsLater);
        BigDecimal committedInstallments = transactionRepository.sumFutureInstallments(userId, today, sixMonthsLater);

        // Lista de receitas pendentes (para o usuário poder marcar como recebidas)
        List<SpendingCapacityDTO.PendingIncome> pendingIncomeList = transactionRepository
                .findPendingIncome(userId)
                .stream()
                .map(t -> new SpendingCapacityDTO.PendingIncome(
                        t.getId(), t.getDescription(), t.getAmount(), t.getDate()))
                .toList();

        BigDecimal netCurrentBalance = bankBalance.subtract(creditCardDebt);
        BigDecimal spendingCapacity = netCurrentBalance.add(expectedIncome).subtract(committedExpenses);

        return new SpendingCapacityDTO(
                bankBalance, creditCardDebt, expectedIncome, committedExpenses,
                committedInstallments, netCurrentBalance, spendingCapacity, pendingIncomeList);
    }

    /**
     * Marca uma receita futura como recebida: associa a uma conta e atualiza o saldo.
     * A receita deve estar sem conta associada (ainda não recebida).
     */
    @Transactional
    public TransactionDTO.Response receiveIncome(UUID id, UUID accountId, String googleId) {
        UUID userId = uid(googleId);
        Transaction transaction = getOwned(id, userId);

        if (transaction.getType() != TransactionType.INCOME) {
            throw new IllegalArgumentException("Apenas receitas podem ser recebidas");
        }
        if (transaction.getAccountId() != null) {
            throw new IllegalArgumentException("Esta receita já foi recebida em uma conta");
        }

        // Adiciona o valor à conta selecionada (a receita ainda não estava em nenhuma conta)
        bankAccountRepository.findById(accountId).ifPresent(account -> {
            account.setBalance(account.getBalance().add(transaction.getAmount()));
            bankAccountRepository.save(account);
        });

        // Marca como recebida: associa conta e data de hoje
        transaction.setAccountId(accountId);
        transaction.setDate(LocalDate.now());
        Transaction saved = transactionRepository.save(transaction);

        return toResponse(saved);
    }

    public DashboardDTO getDashboard(String googleId) {
        UUID userId = uid(googleId);
        LocalDate today = LocalDate.now();
        LocalDate firstDay = today.withDayOfMonth(1);
        LocalDate lastDay = today.withDayOfMonth(today.lengthOfMonth());

        BigDecimal totalBalance = bankAccountRepository.findByUserIdOrderByNameAsc(googleId)
                .stream().map(a -> a.getBalance()).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCardBalance = creditCardRepository.findByUserIdOrderByNameAsc(googleId)
                .stream().map(c -> c.getCurrentBalance()).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSavings = savingsRepository.findByUserIdOrderByNameAsc(googleId)
                .stream().map(s -> s.getAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal income = transactionRepository.sumIncomeByPeriod(userId, firstDay, lastDay);
        BigDecimal expenses = transactionRepository.sumExpensesByPeriod(userId, firstDay, lastDay);

        List<Object[]> rawExpenses = transactionRepository.sumExpensesByCategoryAndPeriod(userId, firstDay, lastDay);
        List<DashboardDTO.CategoryExpense> byCategory = new ArrayList<>();
        for (Object[] row : rawExpenses) {
            UUID catId = (UUID) row[0];
            BigDecimal total = (BigDecimal) row[1];
            String catName = "Sem categoria";
            String catColor = "#94a3b8";
            if (catId != null) {
                var cat = categoryRepository.findById(catId);
                if (cat.isPresent()) {
                    catName = cat.get().getName();
                    catColor = cat.get().getColor() != null ? cat.get().getColor() : "#94a3b8";
                }
            }
            byCategory.add(new DashboardDTO.CategoryExpense(
                    catId != null ? catId.toString() : null, catName, catColor, total));
        }

        List<TransactionDTO.Response> recent = transactionRepository
                .findByUserIdOrderByDateDescCreatedAtDesc(userId, PageRequest.of(0, 5))
                .stream().map(this::toResponse).toList();

        return new DashboardDTO(totalBalance, totalCardBalance, totalSavings, income, expenses, byCategory, recent);
    }

    // ------------------- helpers -------------------

    private UUID uid(String googleId) {
        return userService.resolveId(googleId);
    }

    private void validateTransactionRequest(TransactionDTO.Request req, String googleId) {
        if (req.type() == TransactionType.EXPENSE
                && req.accountId() == null && req.creditCardId() == null) {
            throw new IllegalArgumentException("Despesa deve ter conta bancária ou cartão de crédito associado");
        }
    }

    private void updateBalances(Transaction t, BigDecimal oldAmount, BigDecimal newAmount) {
        BigDecimal delta = newAmount.subtract(oldAmount);

        if (t.getAccountId() != null) {
            bankAccountRepository.findById(t.getAccountId()).ifPresent(account -> {
                if (t.getType() == TransactionType.INCOME) {
                    account.setBalance(account.getBalance().add(delta));
                } else {
                    account.setBalance(account.getBalance().subtract(delta));
                }
                bankAccountRepository.save(account);
            });
        }

        if (t.getCreditCardId() != null) {
            creditCardRepository.findById(t.getCreditCardId()).ifPresent(card -> {
                if (isInCurrentBillingPeriod(t.getDate(), card.getClosingDay())) {
                    card.setCurrentBalance(card.getCurrentBalance().add(delta));
                    creditCardRepository.save(card);
                }
            });
        }
    }

    private boolean isInCurrentBillingPeriod(LocalDate transactionDate, Integer closingDay) {
        LocalDate today = LocalDate.now();
        int day = closingDay != null ? closingDay : 1;

        LocalDate thisMonthClosing = today.withDayOfMonth(Math.min(day, today.lengthOfMonth()));

        LocalDate lastClosing;
        if (today.isAfter(thisMonthClosing)) {
            lastClosing = thisMonthClosing;
        } else {
            LocalDate prevMonth = today.minusMonths(1);
            lastClosing = prevMonth.withDayOfMonth(Math.min(day, prevMonth.lengthOfMonth()));
        }

        LocalDate nextClosing = lastClosing.plusMonths(1)
                .withDayOfMonth(Math.min(day, lastClosing.plusMonths(1).lengthOfMonth()));

        return transactionDate.isAfter(lastClosing) && !transactionDate.isAfter(nextClosing);
    }

    private Transaction getOwned(UUID id, UUID userId) {
        return transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada: " + id));
    }

    private TransactionDTO.Response toResponse(Transaction t) {
        String catName = null, catColor = null;
        if (t.getCategoryId() != null) {
            var cat = categoryRepository.findById(t.getCategoryId());
            catName = cat.map(c -> c.getName()).orElse(null);
            catColor = cat.map(c -> c.getColor()).orElse(null);
        }
        String accName = null;
        if (t.getAccountId() != null)
            accName = bankAccountRepository.findById(t.getAccountId()).map(a -> a.getName()).orElse(null);
        String cardName = null;
        if (t.getCreditCardId() != null)
            cardName = creditCardRepository.findById(t.getCreditCardId()).map(c -> c.getName()).orElse(null);
        return TransactionDTO.Response.from(t, catName, catColor, accName, cardName);
    }
}
