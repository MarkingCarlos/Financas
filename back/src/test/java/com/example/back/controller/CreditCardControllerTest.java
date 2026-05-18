package com.example.back.controller;

import com.example.back.config.TestSecurityConfig;
import com.example.back.dto.CreditCardDTO;
import com.example.back.service.CreditCardService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CreditCardController.class)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class CreditCardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CreditCardService service;

    private static final String USER_ID = TestSecurityConfig.TEST_USER_ID;

    @Test
    void deveListarCartoesDoUsuario() throws Exception {
        List<CreditCardDTO.Response> cards = List.of(
                new CreditCardDTO.Response(UUID.randomUUID(), "Nubank", "Nubank", "1234",
                        new BigDecimal("5000"), new BigDecimal("800"), 10, 20,
                        LocalDate.now().plusDays(5), LocalDate.now().plusDays(15),
                        null, LocalDateTime.now(), LocalDateTime.now())
        );
        when(service.findAll(USER_ID)).thenReturn(cards);

        mockMvc.perform(get("/api/credit-cards").with(jwt().jwt(j -> j.subject(USER_ID))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Nubank"))
                .andExpect(jsonPath("$[0].closingDay").value(10))
                .andExpect(jsonPath("$[0].dueDay").value(20));
    }

    @Test
    void deveCriarCartaoComDiasValidos() throws Exception {
        CreditCardDTO.Request req = new CreditCardDTO.Request(
                "XP Visa", "XP", "4321", new BigDecimal("10000"), BigDecimal.ZERO, 15, 25);

        CreditCardDTO.Response res = new CreditCardDTO.Response(
                UUID.randomUUID(), "XP Visa", "XP", "4321",
                new BigDecimal("10000"), BigDecimal.ZERO, 15, 25,
                LocalDate.now().plusDays(9), LocalDate.now().plusDays(19),
                null, LocalDateTime.now(), LocalDateTime.now());

        when(service.create(any(), eq(USER_ID))).thenReturn(res);

        mockMvc.perform(post("/api/credit-cards")
                        .with(jwt().jwt(j -> j.subject(USER_ID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.closingDay").value(15))
                .andExpect(jsonPath("$.dueDay").value(25));
    }

    @Test
    void deveRejeitarDiaFechamentoInvalido() throws Exception {
        // closingDay = 0, viola @Min(1)
        String body = """
                {"name":"Cartão","closingDay":0,"dueDay":10}
                """;

        mockMvc.perform(post("/api/credit-cards")
                        .with(jwt().jwt(j -> j.subject(USER_ID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
