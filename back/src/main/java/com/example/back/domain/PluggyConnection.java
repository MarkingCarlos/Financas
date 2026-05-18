package com.example.back.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conexoes_pluggy")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PluggyConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private String userId;

    @Column(name = "item_id", nullable = false, unique = true)
    private String itemId;

    @Column(name = "conector_id")
    private Long connectorId;

    @Column(name = "nome_conector")
    private String connectorName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PluggyStatus status = PluggyStatus.ACTIVE;

    @Column(name = "ultima_sincronizacao")
    private LocalDateTime lastSyncAt;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime updatedAt;

    public enum PluggyStatus {
        ACTIVE, UPDATING, ERROR, DISCONNECTED
    }
}
