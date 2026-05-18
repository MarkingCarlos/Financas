package com.example.back.dto;

import com.example.back.domain.Category;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class CategoryDTO {

    public record Request(
            @NotBlank String name,
            String color,
            String icon
    ) {}

    public record Response(
            UUID id,
            String name,
            String color,
            String icon,
            boolean isDefault
    ) {
        public static Response from(Category category) {
            return new Response(
                    category.getId(),
                    category.getName(),
                    category.getColor(),
                    category.getIcon(),
                    category.isDefault()
            );
        }
    }
}
