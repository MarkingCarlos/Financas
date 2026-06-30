package com.example.back.service;

import com.example.back.domain.Bill;
import com.example.back.domain.BillStatus;
import com.example.back.domain.CreditCard;
import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionSource;
import com.example.back.domain.TransactionType;
import com.example.back.dto.BillDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.BankAccountRepository;
import com.example.back.repository.BillRepository;
import com.example.back.repository.CreditCardRepository;
import com.example.back.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final CreditCardRepository creditCardRepository;
    private final TransactionRepository transactionRepository;
    private final BankAccountRepository bankAccountRepository;

    public List<BillDTO.Response> getBillsForCard(UUID cardId, String userId) {
        getOwnedCard(cardId, userId);
        return getBillResponsesForCard(cardId);
    }

    public BigDecimal getTotalCreditCardDebt(String userId) {
        return creditCardRepository.findByUserIdOrderByNameAsc(userId).stream()
                .flatMap(card -> billRepository.findByCreditCardIdOrderByAnoDescMesDesc(card.getId())
                        .stream()
                        .filter(b -> b.getStatus() == BillStatus.ABERTA || b.getStatus() == BillStatus.FECHADA)
                        .map(bill -> {
                            LocalDate start = LocalDate.of(bill.getAno(), bill.getMes(), 1);
                            LocalDate end = start.plusMonths(1);
                            return transactionRepository.sumNonSubscriptionExpensesByCreditCardAndDateRange(
                                    bill.getCreditCardId(), start, end);
                        }))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    List<BillDTO.Response> getBillResponsesForCard(UUID cardId) {
        YearMonth currentMonth = YearMonth.now();
        billRepository.findByCreditCardIdAndStatusOrderByAnoAscMesAsc(cardId, BillStatus.FUTURA)
                .stream()
                .filter(b -> !YearMonth.of(b.getAno(), b.getMes()).isAfter(currentMonth))
                .forEach(b -> {
                    b.setStatus(BillStatus.ABERTA);
                    billRepository.save(b);
                });
        return billRepository.findByCreditCardIdOrderByAnoDescMesDesc(cardId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public BillDTO.Response closeBill(UUID billId, String userId) {
        Bill bill = getOwnedBill(billId, userId);
        if (bill.getStatus() != BillStatus.ABERTA) {
            throw new IllegalStateException("Apenas faturas abertas podem ser fechadas");
        }
        bill.setStatus(BillStatus.FECHADA);
        bill.setFechadoEm(LocalDate.now());
        billRepository.save(bill);

        YearMonth next = YearMonth.of(bill.getAno(), bill.getMes()).plusMonths(1);
        Bill nextBill = billRepository
                .findByCreditCardIdAndMesAndAno(bill.getCreditCardId(), next.getMonthValue(), next.getYear())
                .orElseGet(() -> billRepository.save(Bill.builder()
                        .creditCardId(bill.getCreditCardId())
                        .mes(next.getMonthValue())
                        .ano(next.getYear())
                        .status(BillStatus.ABERTA)
                        .build()));

        if (nextBill.getStatus() == BillStatus.FUTURA) {
            nextBill.setStatus(BillStatus.ABERTA);
            billRepository.save(nextBill);
        }

        return toResponse(bill);
    }

    @Transactional
    public BillDTO.Response payBill(UUID billId, BillDTO.PayRequest req, String userId) {
        Bill bill = getOwnedBill(billId, userId);
        if (bill.getStatus() == BillStatus.PAGA) {
            throw new IllegalStateException("Fatura já foi paga");
        }

        CreditCard card = creditCardRepository.findById(bill.getCreditCardId())
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));

        var account = bankAccountRepository.findByIdAndUserId(req.accountId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));

        if (account.getBalance().compareTo(req.amount()) < 0) {
            throw new IllegalArgumentException("Saldo insuficiente na conta para pagar a fatura");
        }

        account.setBalance(account.getBalance().subtract(req.amount()));
        bankAccountRepository.save(account);

        BigDecimal newBalance = card.getCurrentBalance().subtract(req.amount());
        card.setCurrentBalance(newBalance.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newBalance);
        creditCardRepository.save(card);

        Transaction payment = Transaction.builder()
                .userId(UUID.fromString(userId))
                .type(TransactionType.EXPENSE)
                .description("Pagamento fatura " + card.getName() + " — " + formatBillMonth(bill))
                .amount(req.amount())
                .date(req.date())
                .accountId(account.getId())
                .source(TransactionSource.MANUAL)
                .build();
        transactionRepository.save(payment);

        bill.setStatus(BillStatus.PAGA);
        billRepository.save(bill);

        return toResponse(bill);
    }

    public Bill getOrCreateBill(UUID cardId, int mes, int ano) {
        return billRepository.findByCreditCardIdAndMesAndAno(cardId, mes, ano)
                .orElseGet(() -> {
                    YearMonth billMonth = YearMonth.of(ano, mes);
                    YearMonth currentMonth = YearMonth.now();
                    BillStatus status = billMonth.isAfter(currentMonth) ? BillStatus.FUTURA : BillStatus.ABERTA;
                    return billRepository.save(
                            Bill.builder().creditCardId(cardId).mes(mes).ano(ano).status(status).build());
                });
    }

    private BillDTO.Response toResponse(Bill bill) {
        LocalDate startDate = LocalDate.of(bill.getAno(), bill.getMes(), 1);
        LocalDate endDate = startDate.plusMonths(1);
        BigDecimal balance = transactionRepository.sumExpensesByCreditCardAndDateRange(
                bill.getCreditCardId(), startDate, endDate);
        return BillDTO.Response.from(bill, balance);
    }

    private Bill getOwnedBill(UUID billId, String userId) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada: " + billId));
        creditCardRepository.findByIdAndUserId(bill.getCreditCardId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada: " + billId));
        return bill;
    }

    private CreditCard getOwnedCard(UUID cardId, String userId) {
        return creditCardRepository.findByIdAndUserId(cardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado: " + cardId));
    }

    private String formatBillMonth(Bill bill) {
        return Month.of(bill.getMes()).getDisplayName(TextStyle.SHORT, new Locale("pt", "BR"))
                + "/" + bill.getAno();
    }
}
