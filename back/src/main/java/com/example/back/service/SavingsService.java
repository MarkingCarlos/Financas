package com.example.back.service;

import com.example.back.domain.Savings;
import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionSource;
import com.example.back.domain.TransactionType;
import com.example.back.dto.SavingsDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.BankAccountRepository;
import com.example.back.repository.SavingsRepository;
import com.example.back.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavingsService {

    private final SavingsRepository savingsRepository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;
    private final UserService userService;

    public List<SavingsDTO.Response> findAll(String userId) {
        return savingsRepository.findByUserIdOrderByNameAsc(userId)
                .stream().map(SavingsDTO.Response::from).toList();
    }

    @Transactional
    public SavingsDTO.Response create(SavingsDTO.Request request, String userId) {
        Savings savings = Savings.builder()
                .userId(userId)
                .name(request.name())
                .amount(request.amount() != null ? request.amount() : BigDecimal.ZERO)
                .color(request.color())
                .icon(request.icon())
                .build();
        return SavingsDTO.Response.from(savingsRepository.save(savings));
    }

    @Transactional
    public SavingsDTO.Response update(UUID id, SavingsDTO.Request request, String userId) {
        Savings savings = getOwned(id, userId);
        savings.setName(request.name());
        if (request.amount() != null) savings.setAmount(request.amount());
        savings.setColor(request.color());
        savings.setIcon(request.icon());
        return SavingsDTO.Response.from(savingsRepository.save(savings));
    }

    @Transactional
    public SavingsDTO.Response deposit(UUID id, BigDecimal amount, String userId) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor deve ser positivo");
        }
        Savings savings = getOwned(id, userId);
        savings.setAmount(savings.getAmount().add(amount));
        return SavingsDTO.Response.from(savingsRepository.save(savings));
    }

    /** Transfere valor do cofre para uma conta bancária */
    @Transactional
    public SavingsDTO.Response transfer(UUID id, SavingsDTO.TransferRequest request, String userId) {
        Savings savings = getOwned(id, userId);

        if (savings.getAmount().compareTo(request.amount()) < 0) {
            throw new IllegalArgumentException("Saldo insuficiente no cofre");
        }

        var account = bankAccountRepository.findByIdAndUserId(request.accountId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));

        savings.setAmount(savings.getAmount().subtract(request.amount()));
        savingsRepository.save(savings);

        account.setBalance(account.getBalance().add(request.amount()));
        bankAccountRepository.save(account);

        Transaction tx = Transaction.builder()
                .userId(userService.resolveId(userId))
                .type(TransactionType.INCOME)
                .description("Transferência do cofre: " + savings.getName())
                .amount(request.amount())
                .date(LocalDate.now())
                .accountId(account.getId())
                .source(TransactionSource.MANUAL)
                .build();
        transactionRepository.save(tx);

        return SavingsDTO.Response.from(savings);
    }

    @Transactional
    public void delete(UUID id, String userId) {
        savingsRepository.delete(getOwned(id, userId));
    }

    private Savings getOwned(UUID id, String userId) {
        return savingsRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cofre não encontrado: " + id));
    }
}
