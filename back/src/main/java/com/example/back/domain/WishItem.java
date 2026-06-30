package com.example.back.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Compra desejada: item que precisa "sobreviver" a um período de espera
 * proporcional ao valor antes de poder ser comprado (cooling-off period).
 *
 * O contador não é persistido: os dias restantes são calculados em tempo de
 * consulta a partir de startedAt + waitDays + penaltyDays.
 */
@Entity
@Table(name = "compras_desejadas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WishItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID userId;

    @Column(name = "nome", nullable = false)
    private String name;

    @Column(name = "valor", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao", nullable = false)
    @Builder.Default
    private WishItemStatus status = WishItemStatus.WAITING;

    /** Dias de espera definidos pela faixa de valor NO MOMENTO DA CRIAÇÃO (regra futura não altera itens antigos) */
    @Column(name = "dias_espera", nullable = false)
    private int waitDays;

    /** Dias extras acumulados por punições (+2 a cada compra antecipada do usuário) */
    @Column(name = "dias_punicao", nullable = false)
    @Builder.Default
    private int penaltyDays = 0;

    /** Início (ou reinício, após reativação) da contagem */
    @Column(name = "iniciado_em", nullable = false)
    private LocalDate startedAt;

    /** Data da desistência; reativação só é permitida 7 dias depois */
    @Column(name = "desativado_em")
    private LocalDate deactivatedAt;

    /** Transação do módulo de finanças vinculada quando a compra é realizada */
    @Column(name = "transacao_id")
    private UUID transactionId;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime updatedAt;
}
