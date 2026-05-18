package com.example.back;

import com.example.back.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class BackApplicationTests {

    @Test
    void contextLoads() {
        // Verifica que o contexto Spring sobe corretamente com H2
    }
}
