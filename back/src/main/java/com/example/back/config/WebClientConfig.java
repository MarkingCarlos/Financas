package com.example.back.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${pluggy.base-url:https://api.pluggy.ai}")
    private String pluggyBaseUrl;

    @Bean
    public WebClient pluggyWebClient() {
        return WebClient.builder()
                .baseUrl(pluggyBaseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
