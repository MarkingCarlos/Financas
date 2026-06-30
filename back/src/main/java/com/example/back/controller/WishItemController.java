package com.example.back.controller;

import com.example.back.dto.WishItemDTO;
import com.example.back.service.WishItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wish-items")
@RequiredArgsConstructor
public class WishItemController extends BaseController {

    private final WishItemService service;

    @GetMapping
    public List<WishItemDTO.Response> list(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WishItemDTO.Response create(@Valid @RequestBody WishItemDTO.Request request,
                                       @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, userId(jwt));
    }

    /** Desistência: item fica inativo por 7 dias antes de poder ser reativado */
    @PatchMapping("/{id}/give-up")
    public WishItemDTO.Response giveUp(@PathVariable UUID id,
                                       @AuthenticationPrincipal Jwt jwt) {
        return service.giveUp(id, userId(jwt));
    }

    /** Reativação: contador volta ao valor cheio da faixa, punições zeradas */
    @PatchMapping("/{id}/reactivate")
    public WishItemDTO.Response reactivate(@PathVariable UUID id,
                                           @AuthenticationPrincipal Jwt jwt) {
        return service.reactivate(id, userId(jwt));
    }

    /**
     * Marca como comprada, vinculando uma transação (despesa) do módulo de finanças.
     * Se o contador ainda não zerou, o backend aplica a punição de +2 dias
     * em todos os outros contadores ativos.
     */
    @PatchMapping("/{id}/purchase")
    public WishItemDTO.Response purchase(@PathVariable UUID id,
                                         @Valid @RequestBody WishItemDTO.PurchaseRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return service.purchase(id, request.transactionId(), userId(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        service.delete(id, userId(jwt));
    }
}
