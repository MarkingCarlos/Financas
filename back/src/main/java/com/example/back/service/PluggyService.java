//package com.example.back.service;
//
//import com.example.back.domain.*;
//import com.example.back.dto.PluggyDTO;
//import com.example.back.repository.*;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//import org.springframework.web.reactive.function.client.WebClient;
//
//import java.math.BigDecimal;
//import java.time.LocalDate;
//import java.time.LocalDateTime;
//import java.util.List;
//import java.util.Map;
//import java.util.UUID;
//
//@Slf4j
//@Service
//@RequiredArgsConstructor
//public class PluggyService {
//
//    private final WebClient pluggyWebClient;
//    private final PluggyConnectionRepository connectionRepository;
//    private final BankAccountRepository bankAccountRepository;
//    private final CreditCardRepository creditCardRepository;
//    private final TransactionRepository transactionRepository;
//
//    @Value("${pluggy.client-id}")
//    private String clientId;
//
//    @Value("${pluggy.client-secret}")
//    private String clientSecret;
//
//    @Value("${pluggy.webhook-url:}")
//    private String webhookUrl;
//
//    // -------- API Key --------
//
//    private String getApiKey() {
//        Map<?, ?> response = pluggyWebClient.post()
//                .uri("/auth")
//                .bodyValue(Map.of("clientId", clientId, "clientSecret", clientSecret))
//                .retrieve()
//                .bodyToMono(Map.class)
//                .block();
//        return (String) response.get("apiKey");
//    }
//
//    // -------- Connect Token (para o widget no frontend) --------
//
//    public PluggyDTO.ConnectTokenResponse createConnectToken(String userId) {
//        String apiKey = getApiKey();
//
//        Map<String, Object> body = new java.util.HashMap<>();
//        body.put("clientUserId", userId);
//        if (webhookUrl != null && !webhookUrl.isBlank()) {
//            body.put("webhookUrl", webhookUrl);
//        }
//
//        Map<?, ?> response = pluggyWebClient.post()
//                .uri("/connect-token")
//                .header("X-API-KEY", apiKey)
//                .bodyValue(body)
//                .retrieve()
//                .bodyToMono(Map.class)
//                .block();
//
//        return new PluggyDTO.ConnectTokenResponse((String) response.get("accessToken"));
//    }
//
//    // -------- Registrar Item após conexão via widget --------
//
//    @Transactional
//    public PluggyDTO.ConnectionResponse registerItem(String itemId, String userId) {
//        String apiKey = getApiKey();
//
//        Map<?, ?> itemData = pluggyWebClient.get()
//                .uri("/items/" + itemId)
//                .header("X-API-KEY", apiKey)
//                .retrieve()
//                .bodyToMono(Map.class)
//                .block();
//
//        Map<?, ?> connector = (Map<?, ?>) itemData.get("connector");
//        Long connectorId = connector != null ? ((Number) connector.get("id")).longValue() : null;
//        String connectorName = connector != null ? (String) connector.get("name") : null;
//
//        PluggyConnection connection = connectionRepository.findByItemId(itemId)
//                .orElse(PluggyConnection.builder()
//                        .userId(userId)
//                        .itemId(itemId)
//                        .build());
//
//        connection.setConnectorId(connectorId);
//        connection.setConnectorName(connectorName);
//        connection.setStatus(PluggyConnection.PluggyStatus.ACTIVE);
//
//        PluggyConnection saved = connectionRepository.save(connection);
//
//        // Sincroniza contas e transações imediatamente
//        syncItem(itemId, userId, apiKey);
//
//        return PluggyDTO.ConnectionResponse.from(saved);
//    }
//
//    // -------- Listar conexões do usuário --------
//
//    public List<PluggyDTO.ConnectionResponse> listConnections(String userId) {
//        return connectionRepository.findByUserIdOrderByCreatedAtDesc(userId)
//                .stream()
//                .map(PluggyDTO.ConnectionResponse::from)
//                .toList();
//    }
//
//    // -------- Sincronizar dados de um item --------
//
//    @Transactional
//    public void syncItem(String itemId, String userId, String apiKey) {
//        if (apiKey == null) apiKey = getApiKey();
//
//        List<?> accounts = fetchAccounts(itemId, apiKey);
//        for (Object rawAccount : accounts) {
//            Map<?, ?> acc = (Map<?, ?>) rawAccount;
//            String type = (String) acc.get("type");
//            String accountId = (String) acc.get("id");
//
//            if ("BANK".equals(type)) {
//                syncBankAccount(acc, userId);
//            } else if ("CREDIT".equals(type)) {
//                syncCreditCard(acc, userId);
//            }
//
//            // Sincroniza transações da conta
//            syncTransactions(accountId, userId, apiKey);
//        }
//
//        connectionRepository.findByItemId(itemId).ifPresent(conn -> {
//            conn.setLastSyncAt(LocalDateTime.now());
//            conn.setStatus(PluggyConnection.PluggyStatus.ACTIVE);
//            connectionRepository.save(conn);
//        });
//    }
//
//    // -------- Webhook handler --------
//
//    @Transactional
//    public void handleWebhook(PluggyDTO.WebhookPayload payload) {
//        String itemId = payload.itemId();
//        connectionRepository.findByItemId(itemId).ifPresent(conn -> {
//            conn.setStatus(PluggyConnection.PluggyStatus.UPDATING);
//            connectionRepository.save(conn);
//            syncItem(itemId, conn.getUserId(), null);
//        });
//    }
//
//    // -------- Desconectar --------
//
//    @Transactional
//    public void disconnect(UUID connectionId, String userId) {
//        PluggyConnection conn = connectionRepository.findByIdAndUserId(connectionId, userId)
//                .orElseThrow(() -> new com.example.back.exception.ResourceNotFoundException(
//                        "Conexão não encontrada: " + connectionId));
//
//        try {
//            String apiKey = getApiKey();
//            pluggyWebClient.delete()
//                    .uri("/items/" + conn.getItemId())
//                    .header("X-API-KEY", apiKey)
//                    .retrieve()
//                    .toBodilessEntity()
//                    .block();
//        } catch (Exception e) {
//            log.warn("Erro ao deletar item na Pluggy: {}", e.getMessage());
//        }
//
//        conn.setStatus(PluggyConnection.PluggyStatus.DISCONNECTED);
//        connectionRepository.save(conn);
//    }
//
//    // -------- Privados --------
//
//    private List<?> fetchAccounts(String itemId, String apiKey) {
//        Map<?, ?> response = pluggyWebClient.get()
//                .uri("/accounts?itemId=" + itemId)
//                .header("X-API-KEY", apiKey)
//                .retrieve()
//                .bodyToMono(Map.class)
//                .block();
//        return (List<?>) response.get("results");
//    }
//
//    /**
//     * Sincroniza uma conta bancária (type=BANK) recebida da Pluggy com o banco local.
//     *
//     * <p>Fluxo upsert:
//     * <ol>
//     *   <li><b>Conta já existe</b> (mesmo {@code pluggyAccountId}): apenas atualiza o saldo e retorna.</li>
//     *   <li><b>Conta nova</b>: determina o {@link BankAccount.AccountType} pelo campo {@code subtype}
//     *       da Pluggy ({@code SAVINGS_ACCOUNT} → SAVINGS; qualquer outro valor → CHECKING),
//     *       cria o registro e persiste.</li>
//     * </ol>
//     *
//     * @param acc    mapa com os campos da conta retornados pela API da Pluggy
//     *               (campos usados: {@code id}, {@code balance}, {@code subtype}, {@code name})
//     * @param userId identificador do usuário dono da conta (subject do JWT do Google)
//     */
////    private void syncBankAccount(Map<?, ?> acc, String userId) {
////        String pluggyAccountId = (String) acc.get("id");
////
////        // Upsert: se a conta já foi importada anteriormente, só atualiza o saldo
////        if (bankAccountRepository.existsByPluggyAccountId(pluggyAccountId)) {
////            bankAccountRepository.findByPluggyAccountId(pluggyAccountId).ifPresent(account -> {
////                account.setBalance(toBigDecimal(acc.get("balance")));
////                bankAccountRepository.save(account);
////            });
////            return;
////        }
////
////        // Conta nova: mapeia o subtype da Pluggy para o enum interno
////        String subtype = (String) acc.get("subtype");
////        BankAccount.AccountType type = switch (subtype != null ? subtype : "") {
////            case "SAVINGS_ACCOUNT" -> BankAccount.AccountType.SAVINGS;
////            default -> BankAccount.AccountType.CHECKING;
////        };
////
////        BankAccount account = BankAccount.builder()
////                .userId(userId)
////                .name((String) acc.get("name"))
////                .balance(toBigDecimal(acc.get("balance")))
////                .accountType(type)
////                .pluggyAccountId(pluggyAccountId)
////                .build();
////        bankAccountRepository.save(account);
////    }
//
//    private void syncCreditCard(Map<?, ?> acc, String userId) {
//        String pluggyAccountId = (String) acc.get("id");
//        if (creditCardRepository.existsByPluggyAccountId(pluggyAccountId)) {
//            creditCardRepository.findByPluggyAccountId(pluggyAccountId).ifPresent(card -> {
//                Map<?, ?> creditData = (Map<?, ?>) acc.get("creditData");
//                if (creditData != null) {
//                    card.setCurrentBalance(toBigDecimal(creditData.get("availableCreditLimit")));
//                    card.setCreditLimit(toBigDecimal(creditData.get("creditLimit")));
//                }
//                creditCardRepository.save(card);
//            });
//            return;
//        }
//
//        Map<?, ?> creditData = (Map<?, ?>) acc.get("creditData");
//        int closingDay = 10, dueDay = 20;
//        if (creditData != null) {
//            String closeDate = (String) creditData.get("balanceCloseDate");
//            String dueDate = (String) creditData.get("balanceDueDate");
//            if (closeDate != null) closingDay = LocalDate.parse(closeDate).getDayOfMonth();
//            if (dueDate != null) dueDay = LocalDate.parse(dueDate).getDayOfMonth();
//        }
//
//        CreditCard card = CreditCard.builder()
//                .userId(userId)
//                .name((String) acc.get("name"))
//                .creditLimit(creditData != null ? toBigDecimal(creditData.get("creditLimit")) : BigDecimal.ZERO)
//                .currentBalance(BigDecimal.ZERO)
//                .closingDay(closingDay)
//                .dueDay(dueDay)
//                .pluggyAccountId(pluggyAccountId)
//                .build();
//        creditCardRepository.save(card);
//    }
//
//    private void syncTransactions(String accountId, String userId, String apiKey) {
//        Map<?, ?> response = pluggyWebClient.get()
//                .uri("/transactions?accountId=" + accountId + "&pageSize=100")
//                .header("X-API-KEY", apiKey)
//                .retrieve()
//                .bodyToMono(Map.class)
//                .block();
//
//        List<?> results = (List<?>) response.get("results");
//        if (results == null) return;
//
//        // Resolve conta local
//        UUID localAccountId = bankAccountRepository.findByPluggyAccountId(accountId)
//                .map(BankAccount::getId).orElse(null);
//        UUID localCardId = creditCardRepository.findByPluggyAccountId(accountId)
//                .map(CreditCard::getId).orElse(null);
//
//        for (Object rawTx : results) {
//            Map<?, ?> tx = (Map<?, ?>) rawTx;
//            String pluggyTxId = (String) tx.get("id");
//            if (transactionRepository.existsByPluggyTransactionId(pluggyTxId)) continue;
//
//            String txType = (String) tx.get("type");
//            TransactionType type = "CREDIT".equals(txType) ? TransactionType.INCOME : TransactionType.EXPENSE;
//
//            Transaction transaction = Transaction.builder()
//                    .userId(userId)
//                    .type(type)
//                    .description((String) tx.get("description"))
//                    .amount(toBigDecimal(tx.get("amount")).abs())
//                    .date(LocalDate.parse(((String) tx.get("date")).substring(0, 10)))
//                    .accountId(localAccountId)
//                    .creditCardId(localCardId)
//                    .source(TransactionSource.PLUGGY)
//                    .pluggyTransactionId(pluggyTxId)
//                    .build();
//            transactionRepository.save(transaction);
//        }
//    }
//
//    private BigDecimal toBigDecimal(Object value) {
//        if (value == null) return BigDecimal.ZERO;
//        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
//        return new BigDecimal(value.toString());
//    }
//}
