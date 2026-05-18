package com.example.back.dto;

import com.example.back.domain.Establishment;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class EstablishmentDTO {

    public record Request(
            @NotBlank String name,
            UUID categoryId
    ) {}

    public record Response(
            UUID id,
            String name,
            UUID categoryId,
            String categoryName,
            String categoryColor
    ) {
        public static Response from(Establishment e, String categoryName, String categoryColor) {
            return new Response(e.getId(), e.getName(), e.getCategoryId(), categoryName, categoryColor);
        }
    }
}
