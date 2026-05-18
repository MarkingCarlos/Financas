package com.example.back.service;

import com.example.back.domain.Establishment;
import com.example.back.dto.EstablishmentDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.CategoryRepository;
import com.example.back.repository.EstablishmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EstablishmentService {

    private final EstablishmentRepository repository;
    private final CategoryRepository categoryRepository;

    public List<EstablishmentDTO.Response> findAll(UUID userId) {
        return repository.findByUserIdOrderByNameAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EstablishmentDTO.Response create(EstablishmentDTO.Request request, UUID userId) {
        Establishment e = Establishment.builder()
                .userId(userId)
                .name(request.name())
                .categoryId(request.categoryId())
                .build();
        return toResponse(repository.save(e));
    }

    public EstablishmentDTO.Response update(UUID id, EstablishmentDTO.Request request, UUID userId) {
        Establishment e = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Estabelecimento não encontrado: " + id));
        e.setName(request.name());
        e.setCategoryId(request.categoryId());
        return toResponse(repository.save(e));
    }

    public void delete(UUID id, UUID userId) {
        Establishment e = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Estabelecimento não encontrado: " + id));
        repository.delete(e);
    }

    private EstablishmentDTO.Response toResponse(Establishment e) {
        String catName = null, catColor = null;
        if (e.getCategoryId() != null) {
            var cat = categoryRepository.findById(e.getCategoryId());
            catName = cat.map(c -> c.getName()).orElse(null);
            catColor = cat.map(c -> c.getColor()).orElse(null);
        }
        return EstablishmentDTO.Response.from(e, catName, catColor);
    }
}
