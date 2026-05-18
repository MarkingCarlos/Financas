package com.example.back.service;

import com.example.back.domain.Category;
import com.example.back.dto.CategoryDTO;
import com.example.back.exception.ResourceNotFoundException;
import com.example.back.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository repository;

    @InjectMocks
    private CategoryService service;

    private static final String USER_ID = "user-abc";

    @Test
    void deveListarCategoriasDoUsuario() {
        List<Category> categories = List.of(
                Category.builder().id(UUID.randomUUID()).name("Alimentação").isDefault(true).build(),
                Category.builder().id(UUID.randomUUID()).name("Minha cat").userId(USER_ID).isDefault(false).build()
        );
        when(repository.findAllForUser(USER_ID)).thenReturn(categories);

        List<CategoryDTO.Response> result = service.findAll(USER_ID);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(CategoryDTO.Response::name).containsExactly("Alimentação", "Minha cat");
    }

    @Test
    void deveCriarCategoriaPersonalizada() {
        CategoryDTO.Request req = new CategoryDTO.Request("Streaming", "#6366f1", "tv");

        Category saved = Category.builder()
                .id(UUID.randomUUID()).userId(USER_ID)
                .name("Streaming").color("#6366f1").icon("tv").isDefault(false).build();

        when(repository.save(any(Category.class))).thenReturn(saved);

        CategoryDTO.Response result = service.create(req, USER_ID);

        assertThat(result.name()).isEqualTo("Streaming");
        assertThat(result.isDefault()).isFalse();
        verify(repository).save(any(Category.class));
    }

    @Test
    void deveLancarExcecaoAoEditarCategoriaDeOutroUsuario() {
        UUID id = UUID.randomUUID();
        when(repository.findByIdAndUserId(id, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(id, new CategoryDTO.Request("X", null, null), USER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void deveDeletarCategoriaPropriaDoUsuario() {
        UUID id = UUID.randomUUID();
        Category cat = Category.builder().id(id).userId(USER_ID).name("Old").isDefault(false).build();
        when(repository.findByIdAndUserId(id, USER_ID)).thenReturn(Optional.of(cat));

        service.delete(id, USER_ID);

        verify(repository).delete(cat);
    }
}
