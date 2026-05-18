package com.example.back.service;

import com.example.back.domain.BankAccount;
import com.example.back.dto.BankAccountDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.BankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BankAccountService {

    private final BankAccountRepository repository;

    public List<BankAccountDTO.Response> findAll(String userId) {
        return repository.findByUserIdOrderByNameAsc(userId)
                .stream()
                .map(BankAccountDTO.Response::from)
                .toList();
    }

    public BankAccountDTO.Response findById(UUID id, String userId) {
        BankAccount account = getOwnedAccount(id, userId);
        return BankAccountDTO.Response.from(account);
    }

    @Transactional
    public BankAccountDTO.Response create(BankAccountDTO.Request request, String userId) {
        BankAccount account = BankAccount.builder()
                .userId(userId)
                .name(request.name())
                .accountNumber(request.accountNumber())
                .balance(request.balance() != null ? request.balance() : java.math.BigDecimal.ZERO)
                .accountType(request.accountType())
                .build();
        return BankAccountDTO.Response.from(repository.save(account));
    }

    @Transactional
    public BankAccountDTO.Response update(UUID id, BankAccountDTO.Request request, String userId) {
        BankAccount account = getOwnedAccount(id, userId);
        account.setName(request.name());
        account.setAccountNumber(request.accountNumber());
        if (request.balance() != null) account.setBalance(request.balance());
        account.setAccountType(request.accountType());
        return BankAccountDTO.Response.from(repository.save(account));
    }

    @Transactional
    public void delete(UUID id, String userId) {
        BankAccount account = getOwnedAccount(id, userId);
        repository.delete(account);
    }

    private BankAccount getOwnedAccount(UUID id, String userId) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta bancária não encontrada: " + id));
    }
}
