package com.example.back.service;

import com.example.back.domain.Category;
import com.example.back.dto.CategoryDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository repository;

    public List<CategoryDTO.Response> findAll(String userId) {
        return repository.findAllForUser(userId)
                .stream()
                .map(CategoryDTO.Response::from)
                .toList();
    }

    @Transactional
    public CategoryDTO.Response create(CategoryDTO.Request request, String userId) {
        Category category = Category.builder()
                .userId(userId)
                .name(request.name())
                .color(request.color())
                .icon(request.icon())
                .isDefault(false)
                .build();
        return CategoryDTO.Response.from(repository.save(category));
    }

    @Transactional
    public CategoryDTO.Response update(UUID id, CategoryDTO.Request request, String userId) {
        Category category = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada: " + id));
        category.setName(request.name());
        category.setColor(request.color());
        category.setIcon(request.icon());
        return CategoryDTO.Response.from(repository.save(category));
    }

    @Transactional
    public void delete(UUID id, String userId) {
        Category category = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada: " + id));
        repository.delete(category);
    }
}
