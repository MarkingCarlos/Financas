package com.example.back.controller;

import com.example.back.dto.CreditCardDTO;
import com.example.back.service.CreditCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/credit-cards")
@RequiredArgsConstructor
public class CreditCardController extends BaseController {

    private final CreditCardService service;

    @GetMapping
    public List<CreditCardDTO.Response> list(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(userId(jwt));
    }

    @GetMapping("/{id}")
    public CreditCardDTO.Response getById(@PathVariable UUID id,
                                          @AuthenticationPrincipal Jwt jwt) {
        return service.findById(id, userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreditCardDTO.Response create(@Valid @RequestBody CreditCardDTO.Request request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, userId(jwt));
    }

    @PutMapping("/{id}")
    public CreditCardDTO.Response update(@PathVariable UUID id,
                                         @Valid @RequestBody CreditCardDTO.Request request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, request, userId(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal Jwt jwt) {
        service.delete(id, userId(jwt));
    }
}
