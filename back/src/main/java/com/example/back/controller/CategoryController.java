package com.example.back.controller;

import com.example.back.dto.CategoryDTO;
import com.example.back.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController extends BaseController {

    private final CategoryService service;

    @GetMapping
    public List<CategoryDTO.Response> list(@AuthenticationPrincipal Jwt jwt) {
        return service.findAll(userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDTO.Response create(@Valid @RequestBody CategoryDTO.Request request,
                                       @AuthenticationPrincipal Jwt jwt) {
        return service.create(request, userId(jwt));
    }

    @PutMapping("/{id}")
    public CategoryDTO.Response update(@PathVariable UUID id,
                                       @Valid @RequestBody CategoryDTO.Request request,
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
