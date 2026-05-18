package com.example.back.service;

import com.example.back.domain.User;
import com.example.back.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

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
                                .build()
                ));
    }

    @Transactional
    public UUID resolveId(String googleId) {
        return userRepository.findByGoogleId(googleId)
                .map(User::getId)
                .orElseGet(() -> userRepository.save(
                        User.builder().googleId(googleId).name(googleId).build()
                ).getId());
    }
}
