package com.example.back.service;

import com.example.back.domain.User;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiryMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiry-days:7}") long expiryDays) {
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.expiryMs = TimeUnit.DAYS.toMillis(expiryDays);
    }

    public SecretKey getKey() {
        return key;
    }

    public String issue(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiryMs))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }
}
