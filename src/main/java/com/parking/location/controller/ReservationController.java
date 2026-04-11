package com.parking.location.controller;

import com.parking.location.dto.ReservationHistoryResponse;
import com.parking.location.dto.MessageResponse;
import com.parking.location.dto.ReservationRequest;
import com.parking.location.service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @PostMapping
    public ResponseEntity<?> createReservation(@RequestBody ReservationRequest reservationRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        reservationService.createReservation(reservationRequest, userEmail);
        return ResponseEntity.ok(new MessageResponse("Reservation created successfully"));
    }

    @GetMapping("/user")
    public ResponseEntity<List<ReservationHistoryResponse>> getUserReservations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();
        
        List<ReservationHistoryResponse> reservations = reservationService.getUserReservations(userEmail);
        return ResponseEntity.ok(reservations);
    }

    @GetMapping("/me/history")
    public ResponseEntity<List<ReservationHistoryResponse>> getCurrentUserHistory() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        List<ReservationHistoryResponse> reservations = reservationService.getUserReservations(userEmail);
        return ResponseEntity.ok(reservations);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        reservationService.cancelReservation(id, userEmail);
        return ResponseEntity.ok(new MessageResponse("Reservation cancelled successfully!"));
    }
}
