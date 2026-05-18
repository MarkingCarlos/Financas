package com.example.back.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.Instant;
import java.util.Map;

/**
 * Substitui o JwtDecoder real (que conecta no Auth0) por um mock para testes.
 * Qualquer token passado é decodificado como o usuário "test-user-id".
 */
@TestConfiguration
public class TestSecurityConfig {

    public static final String TEST_USER_ID = "auth0|test-user-id";

    @Bean
    @Primary
    public JwtDecoder testJwtDecoder() {
        return token -> Jwt.withTokenValue(token)
                .header("alg", "none")
                .subject(TEST_USER_ID)
                .claim("aud", java.util.List.of("https://financas-api-test"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claims(c -> c.putAll(Map.of(
                        "email", "test@example.com",
                        "name", "Test User"
                )))
                .build();
    }
}
