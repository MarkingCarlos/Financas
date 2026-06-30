package com.example.back.service;

import com.example.back.domain.RecurrenceType;
import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionSource;
import com.example.back.domain.TransactionType;
import com.example.back.dto.DashboardDTO;
import com.example.back.dto.LifestyleInflationDTO;
import com.example.back.dto.SpendingCapacityDTO;
import com.example.back.dto.ThirdPartyDTO;
import com.example.back.dto.TransactionDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.domain.Bill;
import com.example.back.domain.Savings;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
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
    private final BillService billService;

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

        Transaction saved = saveOne(request, userId, null, RecurrenceType.NONE, null, null, request.date(), null);
        return toResponse(saved);
    }

    private TransactionDTO.Response createSubscription(TransactionDTO.Request request, UUID userId) {
        UUID groupId = UUID.randomUUID();
        UUID incomeGroupId = UUID.randomUUID();
        Transaction first = null;
        for (int i = 0; i < 24; i++) {
            LocalDate date = request.date().plusMonths(i);
            Transaction saved = saveOne(request, userId, groupId, RecurrenceType.SUBSCRIPTION, null, null, date, incomeGroupId);
            if (i == 0) first = saved;
        }
        return toResponse(first);
    }

    private TransactionDTO.Response createInstallments(TransactionDTO.Request request, UUID userId) {
        int startNum = request.installmentNumber() != null ? request.installmentNumber() : 1;
        int total = request.installmentTotal() != null ? request.installmentTotal() : 1;
        UUID groupId = UUID.randomUUID();
        UUID incomeGroupId = UUID.randomUUID();
        Transaction first = null;
        for (int i = 0; i < (total - startNum + 1); i++) {
            LocalDate date = request.date().plusMonths(i);
            int num = startNum + i;
            Transaction saved = saveOne(request, userId, groupId, RecurrenceType.INSTALLMENT, num, total, date, incomeGroupId);
            if (i == 0) first = saved;
        }
        return toResponse(first);
    }

    private Transaction saveOne(TransactionDTO.Request req, UUID userId,
                                UUID groupId, RecurrenceType recurrenceType,
                                Integer installmentNumber, Integer installmentTotal,
                                LocalDate date, UUID incomeGroupId) {
        UUID faturaId = null;
        if (req.creditCardId() != null) {
            Bill bill = billService.getOrCreateBill(req.creditCardId(), date.getMonthValue(), date.getYear());
            faturaId = bill.getId();
        }

        Transaction t = Transaction.builder()
                .userId(userId)
                .type(req.type())
                .description(req.description())
                .amount(req.amount())
                .date(date)
                .categoryId(req.categoryId())
                .accountId(req.accountId())
                .creditCardId(req.creditCardId())
                .faturaId(faturaId)
                .notes(req.notes())
                .recurrenceType(recurrenceType)
                .recurrenceGroupId(groupId)
                .installmentNumber(installmentNumber)
                .installmentTotal(installmentTotal)
                .thirdParty(req.thirdParty())
                .thirdPartyPerson(req.thirdParty() ? req.thirdPartyPerson() : null)
                .thirdPartyAmount(req.thirdParty() ? req.thirdPartyAmount() : null)
                .build();
        Transaction saved = transactionRepository.save(t);
        updateBalances(saved, BigDecimal.ZERO, saved.getAmount());
        // Quando a pessoa paga mais que o valor da parcela, o excedente vira receita
        if (saved.isThirdParty() && saved.getThirdPartyAmount() != null
                && saved.getThirdPartyAmount().compareTo(saved.getAmount()) > 0) {
            createThirdPartyExtraIncome(saved, incomeGroupId);
        }
        return saved;
    }

    private void createThirdPartyExtraIncome(Transaction expense, UUID incomeGroupId) {
        BigDecimal extra = expense.getThirdPartyAmount().subtract(expense.getAmount());
        String cardName = expense.getCreditCardId() != null
                ? creditCardRepository.findById(expense.getCreditCardId())
                        .map(c -> c.getName()).orElse("cartão")
                : null;
        String desc = "Valor adicional enviado por " + expense.getThirdPartyPerson()
                + ", referente a " + expense.getDescription()
                + (cardName != null ? " no cartão " + cardName : "");
        Transaction income = Transaction.builder()
                .userId(expense.getUserId())
                .type(TransactionType.INCOME)
                .description(desc)
                .amount(extra)
                .date(expense.getDate())
                .source(TransactionSource.MANUAL)
                .recurrenceGroupId(incomeGroupId)
                .recurrenceType(incomeGroupId != null ? expense.getRecurrenceType() : RecurrenceType.NONE)
                .installmentNumber(expense.getInstallmentNumber())
                .installmentTotal(expense.getInstallmentTotal())
                .build();
        transactionRepository.save(income);
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

        UUID newFaturaId = null;
        if (request.creditCardId() != null) {
            Bill bill = billService.getOrCreateBill(request.creditCardId(), request.date().getMonthValue(), request.date().getYear());
            newFaturaId = bill.getId();
        }
        transaction.setFaturaId(newFaturaId);

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

    public DashboardDTO getDashboard(String googleId, int year, int month) {
        UUID userId = uid(googleId);
        LocalDate firstDay = LocalDate.of(year, month, 1);
        LocalDate lastDay = firstDay.withDayOfMonth(firstDay.lengthOfMonth());

        // Saldos sempre refletem o momento atual, independente do mês selecionado
        List<Savings> allSavings = savingsRepository.findByUserIdOrderByNameAsc(googleId);
        BigDecimal totalSavings = allSavings.stream().map(Savings::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal availableSavings = allSavings.stream()
                .filter(Savings::isAvailable).map(Savings::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalBalance = bankAccountRepository.findByUserIdOrderByNameAsc(googleId)
                .stream().map(a -> a.getBalance()).reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(availableSavings);

        BigDecimal totalCardBalance = billService.getTotalCreditCardDebt(googleId);

        // Receitas, despesas e gráfico filtrados pelo mês selecionado
        BigDecimal income = transactionRepository.sumIncomeByPeriod(userId, firstDay, lastDay);
        BigDecimal expenses = transactionRepository.sumExpensesByPeriod(userId, firstDay, lastDay);
        BigDecimal thirdPartyCovered = transactionRepository.sumThirdPartyCoveredByPeriod(userId, firstDay, lastDay);
        BigDecimal realExpenses = expenses.subtract(thirdPartyCovered);

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

        // Últimas transações do mês selecionado
        List<TransactionDTO.Response> recent = transactionRepository
                .findByUserIdAndDateBetweenOrderByDateDescCreatedAtDesc(userId, firstDay, lastDay, PageRequest.of(0, 5))
                .stream().map(this::toResponse).toList();

        return new DashboardDTO(totalBalance, totalCardBalance, totalSavings, income, expenses, realExpenses, byCategory, recent, year, month);
    }

    /**
     * Detector de inflação de estilo de vida.
     *
     * Compara a média de gastos dos últimos 3 meses completos com a média dos até 6
     * meses anteriores. Se as despesas crescem no mesmo ritmo (ou mais) que a renda,
     * os aumentos estão sendo absorvidos pelo padrão de vida.
     *
     * Decisões de metodologia:
     * - O mês corrente fica de fora: está incompleto e faria os gastos parecerem menores.
     * - Médias de 3 e 6 meses suavizam ruído (13º salário, parcela grande, IPVA etc.).
     * - Banda de tolerância de ±5 p.p. entre os crescimentos: flutuação normal não dispara alerta.
     */
    public LifestyleInflationDTO getLifestyleInflation(String googleId) {
        UUID userId = uid(googleId);

        LocalDate firstDayCurrentMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate lastCompleteMonthEnd = firstDayCurrentMonth.minusDays(1);
        LocalDate historyStart = firstDayCurrentMonth.minusMonths(12); // até 12 meses completos de histórico

        List<Object[]> rows = transactionRepository.sumMonthlyTotalsByType(userId, historyStart, lastCompleteMonthEnd);

        // Indexa os totais por mês: [0] = renda, [1] = despesa
        Map<YearMonth, BigDecimal[]> totalsByMonth = new LinkedHashMap<>();
        for (Object[] row : rows) {
            YearMonth ym = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            BigDecimal[] totals = totalsByMonth.computeIfAbsent(ym, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            int idx = row[2] == TransactionType.INCOME ? 0 : 1;
            totals[idx] = totals[idx].add((BigDecimal) row[3]);
        }

        // Monta o histórico contínuo, descartando meses iniciais sem nenhum registro
        // (usuário pode ter começado a usar o app no meio da janela de 12 meses)
        List<LifestyleInflationDTO.MonthlySnapshot> history = new ArrayList<>();
        YearMonth cursor = YearMonth.from(historyStart);
        YearMonth lastComplete = YearMonth.from(lastCompleteMonthEnd);
        boolean hasStarted = false;
        while (!cursor.isAfter(lastComplete)) {
            BigDecimal[] totals = totalsByMonth.getOrDefault(cursor, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            boolean monthHasData = totals[0].signum() != 0 || totals[1].signum() != 0;
            if (hasStarted || monthHasData) {
                hasStarted = true;
                history.add(toMonthlySnapshot(cursor, totals[0], totals[1]));
            }
            cursor = cursor.plusMonths(1);
        }

        int recentWindow = 3;
        int minMonths = recentWindow + 3; // 3 meses recentes + pelo menos 3 de base

        if (history.size() < minMonths) {
            return new LifestyleInflationDTO(
                    LifestyleInflationDTO.Status.INSUFFICIENT_DATA,
                    null, null, null, null,
                    "Registre receitas e despesas por pelo menos " + minMonths
                            + " meses completos para detectar tendências no seu padrão de vida. "
                            + "Tendência se enxerga com tempo, não com um mês isolado.",
                    history);
        }

        List<LifestyleInflationDTO.MonthlySnapshot> recent = history.subList(history.size() - recentWindow, history.size());
        int baselineStart = Math.max(0, history.size() - recentWindow - 6); // base de até 6 meses
        List<LifestyleInflationDTO.MonthlySnapshot> baseline = history.subList(baselineStart, history.size() - recentWindow);

        BigDecimal recentIncome = monthlyAverage(recent, true);
        BigDecimal recentExpenses = monthlyAverage(recent, false);
        BigDecimal baselineIncome = monthlyAverage(baseline, true);
        BigDecimal baselineExpenses = monthlyAverage(baseline, false);

        // Sem renda ou sem despesa no período base não há como calcular crescimento percentual
        if (baselineIncome.signum() <= 0 || baselineExpenses.signum() <= 0) {
            return new LifestyleInflationDTO(
                    LifestyleInflationDTO.Status.INSUFFICIENT_DATA,
                    null, null, null, null,
                    "O período base não tem receitas e despesas suficientes para comparar tendências. "
                            + "Continue registrando que em breve o detector terá o que analisar.",
                    history);
        }

        BigDecimal incomeGrowthPct = percentChange(baselineIncome, recentIncome);
        BigDecimal expenseGrowthPct = percentChange(baselineExpenses, recentExpenses);
        BigDecimal recentSavingsRate = savingsRate(recentIncome, recentExpenses);
        BigDecimal baselineSavingsRate = savingsRate(baselineIncome, baselineExpenses);

        // Diferença entre crescimento de gastos e de renda, em pontos percentuais
        BigDecimal inflationGap = expenseGrowthPct.subtract(incomeGrowthPct);
        BigDecimal toleranceBand = BigDecimal.valueOf(5);

        LifestyleInflationDTO.Status status;
        String insight;
        if (inflationGap.compareTo(toleranceBand) >= 0) {
            status = LifestyleInflationDTO.Status.INFLATED;
            insight = String.format(
                    "Seus gastos cresceram %s%% enquanto sua renda variou %s%%. Cada conquista está "
                            + "virando novo padrão de vida — a meta anda dois passos à frente e a sensação de "
                            + "progresso some. Reveja o que subiu nos últimos meses antes que vire \"normal\".",
                    formatPct(expenseGrowthPct), formatPct(incomeGrowthPct));
        } else if (inflationGap.compareTo(toleranceBand.negate()) > 0) {
            status = LifestyleInflationDTO.Status.ATTENTION;
            insight = String.format(
                    "Gastos e renda estão crescendo no mesmo ritmo. Você não está regredindo, mas os "
                            + "aumentos não estão virando patrimônio: sua taxa de poupança ficou em %s%%. "
                            + "Tente capturar parte do próximo aumento antes que o estilo de vida o absorva.",
                    formatPct(recentSavingsRate));
        } else {
            status = LifestyleInflationDTO.Status.HEALTHY;
            insight = String.format(
                    "Sua renda está crescendo mais rápido que seus gastos e a diferença está virando "
                            + "poupança (taxa atual de %s%%). É a lacuna entre o ego e a renda que constrói "
                            + "patrimônio — continue assim.",
                    formatPct(recentSavingsRate));
        }

        return new LifestyleInflationDTO(
                status, incomeGrowthPct, expenseGrowthPct,
                recentSavingsRate, baselineSavingsRate, insight, history);
    }

    public List<ThirdPartyDTO> getThirdPartyPurchases(String googleId) {
        UUID userId = uid(googleId);
        LocalDate today = LocalDate.now();

        List<Transaction> all = transactionRepository.findByUserIdAndThirdPartyTrueOrderByDateAsc(userId);

        Map<UUID, List<Transaction>> groups = new LinkedHashMap<>();
        List<Transaction> singles = new ArrayList<>();

        for (Transaction t : all) {
            if (t.getRecurrenceGroupId() != null) {
                groups.computeIfAbsent(t.getRecurrenceGroupId(), k -> new ArrayList<>()).add(t);
            } else {
                singles.add(t);
            }
        }

        List<ThirdPartyDTO> result = new ArrayList<>();

        for (List<Transaction> members : groups.values()) {
            members.sort(Comparator.comparing(Transaction::getDate));
            Transaction rep = members.get(0);
            long paid = members.stream().filter(t -> !t.getDate().isAfter(today)).count();
            long remaining = members.stream().filter(t -> t.getDate().isAfter(today)).count();
            LocalDate nextDate = members.stream()
                    .filter(t -> t.getDate().isAfter(today))
                    .map(Transaction::getDate)
                    .min(Comparator.naturalOrder()).orElse(null);
            String cardName = resolveCardName(rep.getCreditCardId());
            BigDecimal repayment = rep.getThirdPartyAmount() != null ? rep.getThirdPartyAmount() : BigDecimal.ZERO;
            BigDecimal effective = rep.getAmount().subtract(repayment).max(BigDecimal.ZERO);
            result.add(new ThirdPartyDTO(
                    rep.getId(), rep.getRecurrenceGroupId(),
                    rep.getDescription(), cardName,
                    rep.getThirdPartyPerson(),
                    rep.getAmount(), repayment, effective,
                    members.size(), (int) paid, (int) remaining,
                    repayment.multiply(BigDecimal.valueOf(remaining)),
                    nextDate, rep.getRecurrenceType()));
        }

        for (Transaction t : singles) {
            boolean done = !t.getDate().isAfter(today);
            String cardName = resolveCardName(t.getCreditCardId());
            BigDecimal repayment = t.getThirdPartyAmount() != null ? t.getThirdPartyAmount() : BigDecimal.ZERO;
            BigDecimal effective = t.getAmount().subtract(repayment).max(BigDecimal.ZERO);
            result.add(new ThirdPartyDTO(
                    t.getId(), null,
                    t.getDescription(), cardName,
                    t.getThirdPartyPerson(),
                    t.getAmount(), repayment, effective,
                    1, done ? 1 : 0, done ? 0 : 1,
                    done ? BigDecimal.ZERO : repayment,
                    done ? null : t.getDate(),
                    t.getRecurrenceType()));
        }

        result.sort(Comparator
                .comparing(ThirdPartyDTO::thirdPartyPerson, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ThirdPartyDTO::description));
        return result;
    }

    private String resolveCardName(UUID cardId) {
        if (cardId == null) return null;
        return creditCardRepository.findById(cardId).map(c -> c.getName()).orElse(null);
    }

    // ------------------- helpers -------------------

    private UUID uid(String googleId) {
        return userService.resolveId(googleId);
    }

    private LifestyleInflationDTO.MonthlySnapshot toMonthlySnapshot(YearMonth ym, BigDecimal income, BigDecimal expenses) {
        String label = ym.getMonth().getDisplayName(TextStyle.SHORT, new Locale("pt", "BR"))
                + "/" + String.format("%02d", ym.getYear() % 100);
        BigDecimal savingsRate = income.signum() > 0 ? savingsRate(income, expenses) : null;
        return new LifestyleInflationDTO.MonthlySnapshot(
                ym.getYear(), ym.getMonthValue(), label, income, expenses, savingsRate);
    }

    /** Média mensal de renda (income = true) ou despesa (income = false) da janela */
    private BigDecimal monthlyAverage(List<LifestyleInflationDTO.MonthlySnapshot> months, boolean income) {
        BigDecimal sum = months.stream()
                .map(m -> income ? m.income() : m.expenses())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(months.size()), 2, RoundingMode.HALF_UP);
    }

    /** Variação percentual entre dois valores, ex.: 100 -> 112 = 12.0 */
    private BigDecimal percentChange(BigDecimal base, BigDecimal current) {
        return current.subtract(base)
                .multiply(BigDecimal.valueOf(100))
                .divide(base, 1, RoundingMode.HALF_UP);
    }

    /** Percentual da renda que sobrou depois das despesas (pode ser negativo) */
    private BigDecimal savingsRate(BigDecimal income, BigDecimal expenses) {
        return income.subtract(expenses)
                .multiply(BigDecimal.valueOf(100))
                .divide(income, 1, RoundingMode.HALF_UP);
    }

    /** Formata percentual para mensagens: vírgula decimal e sem zeros desnecessários */
    private String formatPct(BigDecimal pct) {
        return pct.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private void validateTransactionRequest(TransactionDTO.Request req, String googleId) {
        if (req.type() == TransactionType.EXPENSE
                && req.accountId() == null && req.creditCardId() == null) {
            throw new IllegalArgumentException("Despesa deve ter conta bancária ou cartão de crédito associado");
        }
    }

    private void updateBalances(Transaction t, BigDecimal oldAmount, BigDecimal newAmount) {
        // Compras de terceiro no cartão: apenas a diferença (custo real) impacta o saldo
        BigDecimal effectiveOld = oldAmount;
        BigDecimal effectiveNew = newAmount;
        if (t.isThirdParty() && t.getCreditCardId() != null && t.getThirdPartyAmount() != null) {
            effectiveOld = oldAmount.subtract(t.getThirdPartyAmount()).max(BigDecimal.ZERO);
            effectiveNew = newAmount.subtract(t.getThirdPartyAmount()).max(BigDecimal.ZERO);
        }

        BigDecimal accountDelta = newAmount.subtract(oldAmount);
        BigDecimal cardDelta = effectiveNew.subtract(effectiveOld);

        if (t.getAccountId() != null) {
            bankAccountRepository.findById(t.getAccountId()).ifPresent(account -> {
                if (t.getType() == TransactionType.INCOME) {
                    account.setBalance(account.getBalance().add(accountDelta));
                } else {
                    account.setBalance(account.getBalance().subtract(accountDelta));
                }
                bankAccountRepository.save(account);
            });
        }

        if (t.getCreditCardId() != null) {
            creditCardRepository.findById(t.getCreditCardId()).ifPresent(card -> {
                card.setCurrentBalance(card.getCurrentBalance().add(cardDelta));
                creditCardRepository.save(card);
            });
        }
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
