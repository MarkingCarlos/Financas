package com.example.back.service;

import com.example.back.domain.User;
import com.example.back.exception.EmailAlreadyExistsException;
import com.example.back.exception.GoogleOnlyAccountException;
import com.example.back.exception.InvalidCredentialsException;
import com.example.back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String DEV_GOOGLE_ID = "dev-user";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User findOrCreate(String googleId, String name, String email) {
        return userRepository.findByGoogleId(googleId)
                .map(u -> {
                    if (name != null && !name.equals(u.getName())) {
                        u.setName(name);
                        return userRepository.save(u);
                    }
                    return u;
                })
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .googleId(googleId)
                                .name(name != null ? name : googleId)
                                .email(email)
                                .emailVerified(true)
                                .build()
                ));
    }

    @Transactional
    public UUID resolveId(String userId) {
        if (DEV_GOOGLE_ID.equals(userId)) {
            return userRepository.findByGoogleId(DEV_GOOGLE_ID)
                    .map(User::getId)
                    .orElseGet(() -> userRepository.save(
                            User.builder().googleId(DEV_GOOGLE_ID).name("Dev User").emailVerified(true).build()
                    ).getId());
        }
        // Novo formato: UUID string emitido pelo nosso JWT
        try {
            UUID uuid = UUID.fromString(userId);
            if (userRepository.existsById(uuid)) return uuid;
        } catch (IllegalArgumentException ignored) {}
        // Legado: Google sub armazenado diretamente
        return userRepository.findByGoogleId(userId)
                .map(User::getId)
                .orElseGet(() -> userRepository.save(
                        User.builder().googleId(userId).name(userId).emailVerified(false).build()
                ).getId());
    }

    @Transactional
    public LoginResult loginOrLinkWithGoogle(String googleId, String email, String name, boolean emailVerified) {
        // Usuário já tem essa conta Google
        var existing = userRepository.findByGoogleId(googleId);
        if (existing.isPresent()) {
            User u = existing.get();
            if (name != null && !name.equals(u.getName())) {
                u.setName(name);
                userRepository.save(u);
            }
            return new LoginResult(u, false);
        }

        // Procura por e-mail
        if (email != null) {
            var byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                if (emailVerified) {
                    u.setGoogleId(googleId);
                    if (name != null && !name.equals(u.getName())) u.setName(name);
                    u.setEmailVerified(true);
                    return new LoginResult(userRepository.save(u), true);
                }
                throw new IllegalArgumentException("E-mail não verificado pelo Google — não foi possível vincular a conta.");
            }
        }

        // Cria novo usuário
        User newUser = User.builder()
                .googleId(googleId)
                .name(name != null ? name : (email != null ? email : googleId))
                .email(email)
                .emailVerified(emailVerified)
                .build();
        return new LoginResult(userRepository.save(newUser), false);
    }

    @Transactional(readOnly = true)
    public User loginWithEmail(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (user.getPasswordHash() == null) {
            throw new GoogleOnlyAccountException();
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return user;
    }

    @Transactional
    public LoginResult register(String name, String email, String password) {
        String hash = passwordEncoder.encode(password);
        return userRepository.findByEmail(email)
                .map(u -> {
                    if (u.getPasswordHash() != null) {
                        throw new EmailAlreadyExistsException();
                    }
                    // Conta Google existente — vincula senha
                    u.setPasswordHash(hash);
                    if (u.getName() == null || u.getName().isBlank()) u.setName(name);
                    return new LoginResult(userRepository.save(u), true);
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .name(name)
                            .email(email)
                            .passwordHash(hash)
                            .emailVerified(false)
                            .build();
                    return new LoginResult(userRepository.save(newUser), false);
                });
    }

    public record LoginResult(User user, boolean linked) {}
}
