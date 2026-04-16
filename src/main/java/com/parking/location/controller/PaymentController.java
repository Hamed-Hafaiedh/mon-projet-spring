package com.parking.location.controller;

import com.parking.location.dto.MessageResponse;
import com.parking.location.dto.PaymentRequest;
import com.parking.location.dto.PaymentResponse;
import com.parking.location.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping
    public ResponseEntity<?> makePayment(@RequestBody PaymentRequest paymentRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse("Authentication required"));
        }

        if (paymentRequest == null || paymentRequest.getReservationId() == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Reservation id is required"));
        }

        String userEmail = authentication.getName();
        PaymentResponse payment = paymentService.processPayment(paymentRequest.getReservationId(), userEmail);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPaymentDetails(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse("Authentication required"));
        }

        String userEmail = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));

        return ResponseEntity.ok(paymentService.getPaymentDetails(id, userEmail, isAdmin));
    }
}
