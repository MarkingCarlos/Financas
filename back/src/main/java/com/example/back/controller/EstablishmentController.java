package com.example.back.controller;

import com.example.back.dto.EstablishmentDTO;
import com.example.back.service.EstablishmentService;
import com.example.back.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/establishments")
@RequiredArgsConstructor
public class EstablishmentController extends BaseController {

    private final EstablishmentService service;
    private final UserService userService;

    private UUID uid(Jwt jwt) {
        return userService.resolveId(userId(jwt));
    }

    @GetMapping
    public List<EstablishmentDTO.Response> list(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(uid(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EstablishmentDTO.Response create(@Valid @RequestBody EstablishmentDTO.Request request,
                                            @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, uid(jwt));
    }

    @PutMapping("/{id}")
    public EstablishmentDTO.Response update(@PathVariable UUID id,
                                            @Valid @RequestBody EstablishmentDTO.Request request,
                                            @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, request, uid(jwt));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        service.delete(id, uid(jwt));
    }
}
