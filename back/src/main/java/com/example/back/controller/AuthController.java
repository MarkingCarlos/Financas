package com.example.back.controller;

import com.example.back.domain.User;
import com.example.back.service.GoogleTokenVerifier;
import com.example.back.service.JwtService;
import com.example.back.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @PostMapping("/google")
    public AuthResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        GoogleTokenVerifier.GoogleClaims claims = googleTokenVerifier.verify(request.idToken());
        UserService.LoginResult result = userService.loginOrLinkWithGoogle(
                claims.googleId(), claims.email(), claims.name(), claims.emailVerified());
        return new AuthResponse(jwtService.issue(result.user()), userInfo(result.user()), result.linked());
    }

    @PostMapping("/login")
    public AuthResponse loginWithEmail(@Valid @RequestBody EmailLoginRequest request) {
        User user = userService.loginWithEmail(request.email(), request.password());
        return new AuthResponse(jwtService.issue(user), userInfo(user), false);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        UserService.LoginResult result = userService.register(
                request.name(), request.email(), request.password());
        return new AuthResponse(jwtService.issue(result.user()), userInfo(result.user()), result.linked());
    }

    private UserInfo userInfo(User user) {
        return new UserInfo(user.getId(), user.getName(), user.getEmail());
    }

    record GoogleLoginRequest(@NotBlank String idToken) {}

    record EmailLoginRequest(
            @Email(message = "E-mail inválido") @NotBlank String email,
            @NotBlank String password) {}

    record RegisterRequest(
            @NotBlank(message = "Nome é obrigatório") String name,
            @Email(message = "E-mail inválido") @NotBlank String email,
            @Size(min = 8, message = "Senha deve ter pelo menos 8 caracteres") @NotBlank String password) {}

    record AuthResponse(String token, UserInfo user, boolean linked) {}

    record UserInfo(UUID id, String name, String email) {}
}
