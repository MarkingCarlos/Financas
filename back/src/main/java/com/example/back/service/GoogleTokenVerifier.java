package com.example.back.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class GoogleTokenVerifier {

    private final String googleClientId;
    private final RestTemplate restTemplate = new RestTemplate();

    public GoogleTokenVerifier(@Value("${google.client-id}") String googleClientId) {
        this.googleClientId = googleClientId;
    }

    public GoogleClaims verify(String idToken) {
        @SuppressWarnings("unchecked")
        Map<String, Object> claims = restTemplate.getForObject(
                "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken,
                Map.class);

        if (claims == null || claims.containsKey("error")) {
            throw new RuntimeException("Token Google inválido ou expirado");
        }

        String aud = (String) claims.get("aud");
        if (!googleClientId.equals(aud)) {
            throw new RuntimeException("Token Google inválido: audience incorreta");
        }

        return new GoogleClaims(
                (String) claims.get("sub"),
                (String) claims.get("email"),
                (String) claims.get("name"),
                "true".equals(claims.get("email_verified"))
        );
    }

    public record GoogleClaims(String googleId, String email, String name, boolean emailVerified) {}
}
