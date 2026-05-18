package com.example.back.dto;

import com.example.back.domain.PluggyConnection;

import java.time.LocalDateTime;
import java.util.UUID;

public class PluggyDTO {

    public record ConnectTokenResponse(String connectToken) {}

    public record WebhookPayload(
            String event,
            String itemId
    ) {}

    public record ConnectionResponse(
            UUID id,
            String itemId,
            Long connectorId,
            String connectorName,
            PluggyConnection.PluggyStatus status,
            LocalDateTime lastSyncAt,
            LocalDateTime createdAt
    ) {
        public static ConnectionResponse from(PluggyConnection conn) {
            return new ConnectionResponse(
                    conn.getId(),
                    conn.getItemId(),
                    conn.getConnectorId(),
                    conn.getConnectorName(),
                    conn.getStatus(),
                    conn.getLastSyncAt(),
                    conn.getCreatedAt()
            );
        }
    }
}
