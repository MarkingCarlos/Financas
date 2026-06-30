package com.example.back.controller;

import com.example.back.dto.BillDTO;
import com.example.back.service.BillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController extends BaseController {

    private final BillService service;

    @GetMapping("/card/{cardId}")
    public List<BillDTO.Response> listForCard(@PathVariable UUID cardId,
                                              @AuthenticationPrincipal Jwt jwt) {
        return service.getBillsForCard(cardId, userId(jwt));
    }

    @PostMapping("/{id}/close")
    public BillDTO.Response close(@PathVariable UUID id,
                                  @AuthenticationPrincipal Jwt jwt) {
        return service.closeBill(id, userId(jwt));
    }

    @PostMapping("/{id}/pay")
    public BillDTO.Response pay(@PathVariable UUID id,
                                @Valid @RequestBody BillDTO.PayRequest req,
                                @AuthenticationPrincipal Jwt jwt) {
        return service.payBill(id, req, userId(jwt));
    }
}
