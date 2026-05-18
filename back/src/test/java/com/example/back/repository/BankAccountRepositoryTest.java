package com.example.back.repository;

import com.example.back.domain.BankAccount;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class BankAccountRepositoryTest {

    @Autowired
    private BankAccountRepository repository;

    @Test
    void deveSalvarERecuperarConta() {
        BankAccount conta = BankAccount.builder()
                .userId("user-1")
                .name("Nubank")
                .bankName("Nubank")
                .balance(new BigDecimal("1500.00"))
                .accountType(BankAccount.AccountType.CHECKING)
                .build();

        BankAccount salva = repository.save(conta);

        assertThat(salva.getId()).isNotNull();
        assertThat(salva.getName()).isEqualTo("Nubank");
    }

    @Test
    void deveListarContasPorUsuario() {
        repository.save(BankAccount.builder().userId("user-A").name("Conta 1")
                .balance(BigDecimal.ZERO).accountType(BankAccount.AccountType.CHECKING).build());
        repository.save(BankAccount.builder().userId("user-A").name("Conta 2")
                .balance(BigDecimal.ZERO).accountType(BankAccount.AccountType.SAVINGS).build());
        repository.save(BankAccount.builder().userId("user-B").name("Conta 3")
                .balance(BigDecimal.ZERO).accountType(BankAccount.AccountType.CHECKING).build());

        List<BankAccount> contas = repository.findByUserIdOrderByNameAsc("user-A");

        assertThat(contas).hasSize(2);
        assertThat(contas).extracting(BankAccount::getName).containsExactly("Conta 1", "Conta 2");
    }

    @Test
    void naoDeveRetornarContaDeOutroUsuario() {
        BankAccount conta = repository.save(BankAccount.builder()
                .userId("user-X").name("Secreta")
                .balance(BigDecimal.ZERO).accountType(BankAccount.AccountType.CHECKING).build());

        Optional<BankAccount> resultado = repository.findByIdAndUserId(conta.getId(), "user-Y");

        assertThat(resultado).isEmpty();
    }

    @Test
    void deveDetectarPluggyAccountIdExistente() {
        repository.save(BankAccount.builder()
                .userId("user-1").name("Inter")
                .balance(BigDecimal.ZERO).accountType(BankAccount.AccountType.CHECKING)
                .pluggyAccountId("pluggy-acc-123").build());

        assertThat(repository.existsByPluggyAccountId("pluggy-acc-123")).isTrue();
        assertThat(repository.existsByPluggyAccountId("outro-id")).isFalse();
    }
}
