package com.example.back.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transacoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private TransactionType type;

    @Column(name = "descricao", nullable = false)
    private String description;

    @Column(name = "valor", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "data", nullable = false)
    private LocalDate date;

    @Column(name = "conta_id")
    private UUID accountId;

    @Column(name = "cartao_credito_id")
    private UUID creditCardId;

    @Column(name = "categoria_id")
    private UUID categoryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem", nullable = false)
    @Builder.Default
    private TransactionSource source = TransactionSource.MANUAL;

    @Column(name = "pluggy_transacao_id")
    private String pluggyTransactionId;

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_recorrencia", nullable = false)
    @Builder.Default
    private RecurrenceType recurrenceType = RecurrenceType.NONE;

    @Column(name = "grupo_recorrencia_id")
    private UUID recurrenceGroupId;

    @Column(name = "numero_parcela")
    private Integer installmentNumber;

    @Column(name = "total_parcelas")
    private Integer installmentTotal;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime updatedAt;
}
