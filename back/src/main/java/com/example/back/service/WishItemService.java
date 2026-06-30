package com.example.back.service;

import com.example.back.domain.Transaction;
import com.example.back.domain.TransactionType;
import com.example.back.domain.WishItem;
import com.example.back.domain.WishItemStatus;
import com.example.back.dto.WishItemDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.TransactionRepository;
import com.example.back.repository.WishItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Compras desejadas (cooling-off period): todo desejo de compra precisa
 * sobreviver a um período de espera proporcional ao valor antes de ser liberado.
 *
 * Regras:
 * - Espera por faixa de valor: < R$50 = 1 dia | R$50-100 = 7 | R$100-200 = 15 | > R$200 = 30.
 * - Comprar ANTES do contador zerar é permitido, mas pune TODOS os outros
 *   contadores ativos com +2 dias (a punição é validada aqui no backend).
 * - Desistir deixa o item inativo por 7 dias; reativar zera punições e
 *   reinicia o contador no valor cheio da faixa.
 * - O contador não é persistido: dias restantes são derivados das datas,
 *   então "correm sozinhos" sem necessidade de job agendado.
 */
@Service
@RequiredArgsConstructor
public class WishItemService {

    private static final int PENALTY_DAYS = 2;          // acréscimo por compra antecipada
    private static final int REACTIVATION_QUARANTINE_DAYS = 7; // espera mínima após desistência

    private final WishItemRepository wishItemRepository;
    private final TransactionRepository transactionRepository;
    private final UserService userService;

    public List<WishItemDTO.Response> findAll(String googleId) {
        return wishItemRepository.findByUserIdOrderByCreatedAtDesc(uid(googleId))
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public WishItemDTO.Response create(WishItemDTO.Request request, String googleId) {
        WishItem item = WishItem.builder()
                .userId(uid(googleId))
                .name(request.name())
                .amount(request.amount())
                .notes(request.notes())
                .status(WishItemStatus.WAITING)
                .waitDays(resolveWaitDays(request.amount()))
                .startedAt(LocalDate.now())
                .build();
        return toResponse(wishItemRepository.save(item));
    }

    /** Desistência: item fica inativo e só pode ser reativado após a quarentena */
    @Transactional
    public WishItemDTO.Response giveUp(UUID id, String googleId) {
        WishItem item = getOwned(id, uid(googleId));
        if (item.getStatus() != WishItemStatus.WAITING) {
            throw new IllegalArgumentException("Apenas compras em espera podem ser desistidas");
        }
        item.setStatus(WishItemStatus.INACTIVE);
        item.setDeactivatedAt(LocalDate.now());
        return toResponse(wishItemRepository.save(item));
    }

    /** Reativação: volta com o contador no valor inicial da faixa e punições zeradas */
    @Transactional
    public WishItemDTO.Response reactivate(UUID id, String googleId) {
        WishItem item = getOwned(id, uid(googleId));
        if (item.getStatus() != WishItemStatus.INACTIVE) {
            throw new IllegalArgumentException("Apenas compras desistidas podem ser reativadas");
        }
        LocalDate reactivatableAt = item.getDeactivatedAt().plusDays(REACTIVATION_QUARANTINE_DAYS);
        if (LocalDate.now().isBefore(reactivatableAt)) {
            throw new IllegalArgumentException("Esta compra só pode ser reativada a partir de " + reactivatableAt);
        }
        item.setStatus(WishItemStatus.WAITING);
        item.setStartedAt(LocalDate.now());
        item.setPenaltyDays(0);
        item.setDeactivatedAt(null);
        return toResponse(wishItemRepository.save(item));
    }

    /**
     * Marca a compra como realizada, vinculando a transação do módulo de finanças.
     * Se o contador ainda não zerou (compra antecipada), aplica a punição de
     * +2 dias em todos os OUTROS contadores ativos do usuário.
     */
    @Transactional
    public WishItemDTO.Response purchase(UUID id, UUID transactionId, String googleId) {
        UUID userId = uid(googleId);
        WishItem item = getOwned(id, userId);
        if (item.getStatus() != WishItemStatus.WAITING) {
            throw new IllegalArgumentException("Apenas compras em espera podem ser compradas");
        }

        // A transação precisa existir, pertencer ao usuário e ser uma despesa
        Transaction transaction = transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada: " + transactionId));
        if (transaction.getType() != TransactionType.EXPENSE) {
            throw new IllegalArgumentException("A transação vinculada deve ser uma despesa");
        }

        boolean earlyPurchase = remainingDays(item) > 0;
        if (earlyPurchase) {
            applyGlobalPenalty(userId, item.getId());
        }

        item.setStatus(WishItemStatus.PURCHASED);
        item.setTransactionId(transactionId);
        return toResponse(wishItemRepository.save(item));
    }

    @Transactional
    public void delete(UUID id, String googleId) {
        wishItemRepository.delete(getOwned(id, uid(googleId)));
    }

    // ------------------- helpers -------------------

    /** Punição global: +2 dias em todos os contadores ativos, exceto o do próprio item comprado */
    private void applyGlobalPenalty(UUID userId, UUID excludedItemId) {
        List<WishItem> activeItems = wishItemRepository.findByUserIdAndStatus(userId, WishItemStatus.WAITING);
        for (WishItem active : activeItems) {
            if (!active.getId().equals(excludedItemId)) {
                active.setPenaltyDays(active.getPenaltyDays() + PENALTY_DAYS);
            }
        }
        wishItemRepository.saveAll(activeItems);
    }

    /** Dias de espera por faixa de valor */
    private int resolveWaitDays(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.valueOf(50)) < 0) return 1;
        if (amount.compareTo(BigDecimal.valueOf(100)) < 0) return 7;
        if (amount.compareTo(BigDecimal.valueOf(200)) <= 0) return 15;
        return 30;
    }

    /** Dias que ainda faltam: espera + punições − dias já corridos (nunca negativo) */
    private int remainingDays(WishItem item) {
        long elapsed = ChronoUnit.DAYS.between(item.getStartedAt(), LocalDate.now());
        return (int) Math.max(0, item.getWaitDays() + item.getPenaltyDays() - elapsed);
    }

    private WishItem getOwned(UUID id, UUID userId) {
        return wishItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Compra desejada não encontrada: " + id));
    }

    private UUID uid(String googleId) {
        return userService.resolveId(googleId);
    }

    private WishItemDTO.Response toResponse(WishItem item) {
        int remaining = item.getStatus() == WishItemStatus.WAITING ? remainingDays(item) : 0;
        boolean releasable = item.getStatus() == WishItemStatus.WAITING && remaining == 0;

        LocalDate reactivatableAt = item.getDeactivatedAt() != null
                ? item.getDeactivatedAt().plusDays(REACTIVATION_QUARANTINE_DAYS)
                : null;
        boolean reactivatable = item.getStatus() == WishItemStatus.INACTIVE
                && reactivatableAt != null
                && !LocalDate.now().isBefore(reactivatableAt);

        return new WishItemDTO.Response(
                item.getId(), item.getName(), item.getAmount(), item.getNotes(),
                item.getStatus(), item.getWaitDays(), item.getPenaltyDays(),
                item.getWaitDays() + item.getPenaltyDays(), remaining, releasable,
                item.getStartedAt(), item.getDeactivatedAt(), reactivatableAt, reactivatable,
                item.getTransactionId(), item.getCreatedAt());
    }
}
