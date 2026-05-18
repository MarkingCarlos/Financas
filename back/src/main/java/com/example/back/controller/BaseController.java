package com.example.back.controller;

import org.springframework.security.oauth2.jwt.Jwt;

public abstract class BaseController {

    protected static final String DEV_USER_ID = "dev-user";

    /**
     * Retorna o subject do JWT quando a segurança está ativa,
     * ou "dev-user" quando app.security.enabled=false.
     */
    protected String userId(Jwt jwt) {
        return jwt != null ? jwt.getSubject() : DEV_USER_ID;
    }
}
