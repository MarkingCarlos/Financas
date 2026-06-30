package com.example.back.service;

import com.example.back.domain.CreditCard;
import com.example.back.dto.CreditCardDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.CreditCardRepository;
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
public class CreditCardService {

    private final CreditCardRepository repository;
    private final BillService billService;
    private final TransactionRepository transactionRepository;

    public List<CreditCardDTO.Response> findAll(String userId) {
        return repository.findByUserIdOrderByNameAsc(userId)
                .stream().map(this::toResponse).toList();
    }

    public CreditCardDTO.Response findById(UUID id, String userId) {
        return toResponse(getOwnedCard(id, userId));
    }

    @Transactional
    public CreditCardDTO.Response create(CreditCardDTO.Request request, String userId) {
        if (request.billMonth() == null || request.billYear() == null) {
            throw new IllegalArgumentException("Mês e ano da fatura inicial são obrigatórios");
        }
        CreditCard card = CreditCard.builder()
                .userId(userId)
                .name(request.name())
                .bankName(request.bankName())
                .lastFourDigits(request.lastFourDigits())
                .creditLimit(request.creditLimit())
                .currentBalance(request.currentBalance() != null ? request.currentBalance() : BigDecimal.ZERO)
                .color(request.color())
                .build();
        card = repository.save(card);
        billService.createInitialOpenBill(card.getId(), request.billMonth(), request.billYear());
        return toResponse(card);
    }

    @Transactional
    public CreditCardDTO.Response update(UUID id, CreditCardDTO.Request request, String userId) {
        CreditCard card = getOwnedCard(id, userId);
        card.setName(request.name());
        card.setBankName(request.bankName());
        card.setLastFourDigits(request.lastFourDigits());
        card.setCreditLimit(request.creditLimit());
        if (request.currentBalance() != null) card.setCurrentBalance(request.currentBalance());
        if (request.color() != null) card.setColor(request.color());
        return toResponse(repository.save(card));
    }

    @Transactional
    public void delete(UUID id, String userId) {
        CreditCard card = getOwnedCard(id, userId);
        transactionRepository.deleteByCreditCardId(card.getId());
        billService.deleteBillsForCard(card.getId());
        repository.delete(card);
    }

    public CreditCard getOwnedCard(UUID id, String userId) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão de crédito não encontrado: " + id));
    }

    private CreditCardDTO.Response toResponse(CreditCard card) {
        return CreditCardDTO.Response.from(card, billService.getBillResponsesForCard(card.getId()));
    }
}
