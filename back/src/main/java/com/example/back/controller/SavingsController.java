package com.example.back.controller;

import com.example.back.dto.SavingsDTO;
import com.example.back.service.SavingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/savings")
@RequiredArgsConstructor
public class SavingsController extends BaseController {

    private final SavingsService service;

    @GetMapping
    public List<SavingsDTO.Response> list(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsDTO.Response create(@Valid @RequestBody SavingsDTO.Request request,
                                      @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, userId(jwt));
    }

    @PutMapping("/{id}")
    public SavingsDTO.Response update(@PathVariable UUID id,
                                      @Valid @RequestBody SavingsDTO.Request request,
                                      @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, request, userId(jwt));
    }

    /** Deposita valor no cofre */
    @PostMapping("/{id}/deposit")
    public SavingsDTO.Response deposit(@PathVariable UUID id,
                                       @RequestParam BigDecimal amount,
                                       @AuthenticationPrincipal Jwt jwt) {
        return service.deposit(id, amount, userId(jwt));
    }

    /** Transfere do cofre para uma conta bancária */
    @PostMapping("/{id}/transfer")
    public SavingsDTO.Response transfer(@PathVariable UUID id,
                                        @Valid @RequestBody SavingsDTO.TransferRequest request,
                                        @AuthenticationPrincipal Jwt jwt) {
        return service.transfer(id, request, userId(jwt));
    }

    @PatchMapping("/{id}/available")
    public SavingsDTO.Response toggleAvailable(@PathVariable UUID id,
                                               @AuthenticationPrincipal Jwt jwt) {
        return service.toggleAvailable(id, userId(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        service.delete(id, userId(jwt));
    }
}
