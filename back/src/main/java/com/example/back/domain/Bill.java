package com.example.back.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "faturas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cartao_credito_id", nullable = false)
    private UUID creditCardId;

    @Column(name = "mes", nullable = false)
    private int mes;

    @Column(name = "ano", nullable = false)
    private int ano;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private BillStatus status = BillStatus.ABERTA;

    @Column(name = "fechado_em")
    private LocalDate fechadoEm;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;
}
