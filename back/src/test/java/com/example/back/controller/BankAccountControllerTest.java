package com.example.back.controller;

import com.example.back.config.TestSecurityConfig;
import com.example.back.domain.BankAccount;
import com.example.back.dto.BankAccountDTO;
import com.example.back.service.BankAccountService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BankAccountController.class)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class BankAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BankAccountService service;

    private static final String USER_ID = TestSecurityConfig.TEST_USER_ID;

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtToken() {
        return jwt().jwt(j -> j.subject(USER_ID));
    }

    @Test
    void deveListarContasDoUsuario() throws Exception {
        List<BankAccountDTO.Response> contas = List.of(
                new BankAccountDTO.Response(UUID.randomUUID(), "Nubank", "Nubank", null,
                        new BigDecimal("1500.00"), BankAccount.AccountType.CHECKING,
                        null, LocalDateTime.now(), LocalDateTime.now())
        );
        when(service.findAll(USER_ID)).thenReturn(contas);

        mockMvc.perform(get("/api/accounts").with(jwtToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Nubank"));
    }

    @Test
    void deveCriarContaERetornar201() throws Exception {
        BankAccountDTO.Request req = new BankAccountDTO.Request(
                "Inter", "Inter", "12345-6", new BigDecimal("500.00"), BankAccount.AccountType.CHECKING);

        BankAccountDTO.Response res = new BankAccountDTO.Response(
                UUID.randomUUID(), "Inter", "Inter", "12345-6",
                new BigDecimal("500.00"), BankAccount.AccountType.CHECKING,
                null, LocalDateTime.now(), LocalDateTime.now());

        when(service.create(any(), eq(USER_ID))).thenReturn(res);

        mockMvc.perform(post("/api/accounts")
                        .with(jwtToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Inter"));
    }

    @Test
    void deveRetornar401SemToken() throws Exception {
        mockMvc.perform(get("/api/accounts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveRetornar400ComBodyInvalido() throws Exception {
        // nome é obrigatório, accountType é obrigatório
        String bodyInvalido = """
                {"bankName": "Banco"}
                """;

        mockMvc.perform(post("/api/accounts")
                        .with(jwtToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyInvalido))
                .andExpect(status().isBadRequest());
    }
}
