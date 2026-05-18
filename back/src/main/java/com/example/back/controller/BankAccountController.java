package com.example.back.controller;

import com.example.back.dto.BankAccountDTO;
import com.example.back.service.BankAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class BankAccountController extends BaseController {

    private final BankAccountService service;

    @GetMapping
    public List<BankAccountDTO.Response> list(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(userId(jwt));
    }

    @GetMapping("/{id}")
    public BankAccountDTO.Response getById(@PathVariable UUID id,
                                           @AuthenticationPrincipal Jwt jwt) {
        return service.findById(id, userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BankAccountDTO.Response create(@Valid @RequestBody BankAccountDTO.Request request,
                                          @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, userId(jwt));
    }

    @PutMapping("/{id}")
    public BankAccountDTO.Response update(@PathVariable UUID id,
                                          @Valid @RequestBody BankAccountDTO.Request request,
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
