//package com.example.back.controller;
//
//import com.example.back.dto.PluggyDTO;
//import com.example.back.service.PluggyService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.security.core.annotation.AuthenticationPrincipal;
//import org.springframework.security.oauth2.jwt.Jwt;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/api/pluggy")
//@RequiredArgsConstructor
//public class PluggyController extends BaseController {
//
//    private final PluggyService service;
//
//    @GetMapping("/connect-token")
//    public PluggyDTO.ConnectTokenResponse connectToken(@AuthenticationPrincipal Jwt jwt) {
//        return service.createConnectToken(userId(jwt));
//    }
//
//    @PostMapping("/items/{itemId}")
//    @ResponseStatus(HttpStatus.CREATED)
//    public PluggyDTO.ConnectionResponse registerItem(@PathVariable String itemId,
//                                                     @AuthenticationPrincipal Jwt jwt) {
//        return service.registerItem(itemId, userId(jwt));
//    }
//
//    @GetMapping("/connections")
//    public List<PluggyDTO.ConnectionResponse> listConnections(@AuthenticationPrincipal Jwt jwt) {
//        return service.listConnections(userId(jwt));
//    }
//
//    @PostMapping("/connections/{id}/sync")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void sync(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
//        service.listConnections(userId(jwt)).stream()
//                .filter(c -> c.id().equals(id))
//                .findFirst()
//                .ifPresent(c -> service.syncItem(c.itemId(), userId(jwt), null));
//    }
//
//    @DeleteMapping("/connections/{id}")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void disconnect(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
//        service.disconnect(id, userId(jwt));
//    }
//
//    /** Webhook público — chamado pela Pluggy, sem JWT */
//    @PostMapping("/webhook")
//    public void webhook(@RequestBody PluggyDTO.WebhookPayload payload) {
//        service.handleWebhook(payload);
//    }
//}
