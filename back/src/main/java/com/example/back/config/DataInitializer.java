package com.example.back.config;

import com.example.back.domain.Category;
import com.example.back.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Insere categorias padrão do sistema na primeira execução.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CategoryRepository categoryRepository;

    @Override
    public void run(String... args) {
        if (!categoryRepository.findByIsDefaultTrue().isEmpty()) return;

        List<Category> defaults = List.of(
            Category.builder().name("Alimentação").color("#f97316").icon("utensils").isDefault(true).build(),
            Category.builder().name("Saúde").color("#ec4899").icon("heart-pulse").isDefault(true).build(),
            Category.builder().name("Assinaturas").color("#8b5cf6").icon("repeat").isDefault(true).build(),
            Category.builder().name("Transporte").color("#3b82f6").icon("car").isDefault(true).build(),
            Category.builder().name("Lazer").color("#10b981").icon("gamepad-2").isDefault(true).build(),
            Category.builder().name("Moradia").color("#f59e0b").icon("home").isDefault(true).build(),
            Category.builder().name("Educação").color("#06b6d4").icon("graduation-cap").isDefault(true).build(),
            Category.builder().name("Roupas").color("#84cc16").icon("shirt").isDefault(true).build(),
            Category.builder().name("Salário").color("#22c55e").icon("banknote").isDefault(true).build(),
            Category.builder().name("Outros").color("#94a3b8").icon("more-horizontal").isDefault(true).build()
        );

        categoryRepository.saveAll(defaults);
    }
}
