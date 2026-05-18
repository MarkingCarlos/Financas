package com.example.back.service;

import com.example.back.domain.CreditCard;
import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionSource;
import com.example.back.domain.TransactionType;
import com.example.back.dto.CreditCardDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.BankAccountRepository;
import com.example.back.repository.CreditCardRepository;
import com.example.back.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditCardService {

    private final CreditCardRepository repository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;

    public List<CreditCardDTO.Response> findAll(String userId) {
        return repository.findByUserIdOrderByNameAsc(userId)
                .stream().map(CreditCardDTO.Response::from).toList();
    }

    public CreditCardDTO.Response findById(UUID id, String userId) {
        return CreditCardDTO.Response.from(getOwnedCard(id, userId));
    }

    @Transactional
    public CreditCardDTO.Response create(CreditCardDTO.Request request, String userId) {
        CreditCard card = CreditCard.builder()
                .userId(userId)
                .name(request.name())
                .bankName(request.bankName())
                .lastFourDigits(request.lastFourDigits())
                .creditLimit(request.creditLimit())
                .currentBalance(request.currentBalance() != null ? request.currentBalance() : BigDecimal.ZERO)
                .closingDay(request.closingDay())
                .dueDay(request.dueDay())
                .build();
        return CreditCardDTO.Response.from(repository.save(card));
    }

    @Transactional
    public CreditCardDTO.Response update(UUID id, CreditCardDTO.Request request, String userId) {
        CreditCard card = getOwnedCard(id, userId);
        card.setName(request.name());
        card.setBankName(request.bankName());
        card.setLastFourDigits(request.lastFourDigits());
        card.setCreditLimit(request.creditLimit());
        if (request.currentBalance() != null) card.setCurrentBalance(request.currentBalance());
        card.setClosingDay(request.closingDay());
        card.setDueDay(request.dueDay());
        return CreditCardDTO.Response.from(repository.save(card));
    }

    /** Paga a fatura do cartão debitando de uma conta bancária */
    @Transactional
    public CreditCardDTO.Response payBill(UUID cardId, CreditCardDTO.PaymentRequest request, String userId) {
        CreditCard card = getOwnedCard(cardId, userId);

        var account = bankAccountRepository.findByIdAndUserId(request.accountId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));

        if (account.getBalance().compareTo(request.amount()) < 0) {
            throw new IllegalArgumentException("Saldo insuficiente na conta para pagar a fatura");
        }

        // Debita da conta bancária
        account.setBalance(account.getBalance().subtract(request.amount()));
        bankAccountRepository.save(account);

        // Reduz a dívida do cartão
        BigDecimal novaFatura = card.getCurrentBalance().subtract(request.amount());
        card.setCurrentBalance(novaFatura.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : novaFatura);
        repository.save(card);

        // Registra como transação de despesa na conta
        Transaction payment = Transaction.builder()
                .userId(UUID.fromString(userId))
                .type(TransactionType.EXPENSE)
                .description("Pagamento fatura - " + card.getName())
                .amount(request.amount())
                .date(request.date())
                .accountId(account.getId())
                .source(TransactionSource.MANUAL)
                .build();
        transactionRepository.save(payment);

        return CreditCardDTO.Response.from(card);
    }

    @Transactional
    public void delete(UUID id, String userId) {
        repository.delete(getOwnedCard(id, userId));
    }

    public CreditCard getOwnedCard(UUID id, String userId) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão de crédito não encontrado: " + id));
    }
}
