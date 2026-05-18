package com.example.back.controller;

import com.example.back.domain.TransactionType;
import com.example.back.dto.DashboardDTO;
import com.example.back.dto.SpendingCapacityDTO;
import com.example.back.dto.TransactionDTO;
import com.example.back.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController extends BaseController {

    private final TransactionService service;

    @GetMapping
    public Page<TransactionDTO.Response> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID creditCardId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(defaultValue = "false") boolean noCategory,
            @RequestParam(required = false) String search) {

        String uid = userId(jwt);
        Pageable pageable = PageRequest.of(page, size);

        if (search != null && !search.isBlank()) return service.findBySearch(uid, search, type, pageable);
        if (from != null && to != null) return service.findByPeriod(uid, from, to, pageable);
        if (noCategory)                 return service.findByNullCategory(uid, pageable);
        if (categoryId != null)         return service.findByCategory(uid, categoryId, pageable);
        if (type != null)               return service.findByType(uid, type, pageable);
        if (accountId != null)          return service.findByAccount(uid, accountId, pageable);
        if (creditCardId != null)       return service.findByCard(uid, creditCardId, pageable);
        return service.findAll(uid, pageable);
    }

    @GetMapping("/{id}")
    public TransactionDTO.Response getById(@PathVariable UUID id,
                                           @AuthenticationPrincipal Jwt jwt) {
        return service.findById(id, userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDTO.Response create(@Valid @RequestBody TransactionDTO.Request request,
                                          @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, userId(jwt));
    }

    @PutMapping("/{id}")
    public TransactionDTO.Response update(@PathVariable UUID id,
                                          @Valid @RequestBody TransactionDTO.Request request,
                                          @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, request, userId(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal Jwt jwt) {
        service.delete(id, userId(jwt));
    }

    @GetMapping("/group/{groupId}")
    public List<TransactionDTO.Response> listGroup(@PathVariable UUID groupId,
                                                   @AuthenticationPrincipal Jwt jwt) {
        return service.findByGroup(groupId, userId(jwt));
    }

    /**
     * Cancela uma assinatura ou grupo de parcelamento:
     * remove todas as transações FUTURAS do grupo (data > hoje).
     */
    @DeleteMapping("/group/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelGroup(@PathVariable UUID groupId,
                            @AuthenticationPrincipal Jwt jwt) {
        service.cancelSubscriptionGroup(groupId, userId(jwt));
    }

    /** Retorna despesas futuras agrupadas por mês (próximos 6 meses) */
    @GetMapping("/upcoming")
    public List<TransactionDTO.UpcomingMonth> upcoming(@AuthenticationPrincipal Jwt jwt) {
        return service.getUpcoming(userId(jwt));
    }

    @GetMapping("/dashboard")
    public DashboardDTO dashboard(@AuthenticationPrincipal Jwt jwt) {
        return service.getDashboard(userId(jwt));
    }

    /**
     * Retorna o poder de compra real:
     * contas − cartões + receitas do mês − despesas comprometidas (próximos 6 meses)
     */
    @GetMapping("/spending-capacity")
    public SpendingCapacityDTO spendingCapacity(@AuthenticationPrincipal Jwt jwt) {
        return service.getSpendingCapacity(userId(jwt));
    }

    /**
     * Marca uma receita futura como recebida, creditando em uma conta bancária.
     * Body: { "accountId": "uuid" }
     */
    @PatchMapping("/{id}/receive")
    public TransactionDTO.Response receiveIncome(
            @PathVariable UUID id,
            @RequestBody Map<String, UUID> body,
            @AuthenticationPrincipal Jwt jwt) {
        UUID accountId = body.get("accountId");
        if (accountId == null) throw new IllegalArgumentException("accountId é obrigatório");
        return service.receiveIncome(id, accountId, userId(jwt));
    }
}
