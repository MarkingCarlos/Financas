package com.example.back.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cartoes_credito")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditCard {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private String userId;

    @Column(name = "nome", nullable = false)
    private String name;

    @Column(name = "nome_banco")
    private String bankName;

    @Column(name = "ultimos_quatro_digitos", length = 4)
    private String lastFourDigits;

    @Column(name = "limite_credito", precision = 15, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "saldo_atual", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(name = "pluggy_conta_id")
    private String pluggyAccountId;

    @Column(name = "pluggy_item_id")
    private String pluggyItemId;

    @Column(name = "cor", length = 7)
    private String color;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime updatedAt;
}
