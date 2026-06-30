package com.example.back.repository;

import com.example.back.domain.Bill;
import com.example.back.domain.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BillRepository extends JpaRepository<Bill, UUID> {

    List<Bill> findByCreditCardIdOrderByAnoDescMesDesc(UUID creditCardId);

    Optional<Bill> findByCreditCardIdAndMesAndAno(UUID creditCardId, int mes, int ano);

    List<Bill> findByCreditCardIdAndStatusOrderByAnoAscMesAsc(UUID creditCardId, BillStatus status);

    void deleteByCreditCardId(UUID creditCardId);
}
