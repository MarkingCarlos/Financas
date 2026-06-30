package com.example.back.domain;

/** Estados possíveis de uma compra desejada */
public enum WishItemStatus {
    WAITING,    // contador correndo (ou já zerado, aguardando liberação)
    INACTIVE,   // usuário desistiu; pode reativar após 7 dias, com o contador resetado
    PURCHASED   // compra realizada e vinculada a uma transação do módulo de finanças
}
