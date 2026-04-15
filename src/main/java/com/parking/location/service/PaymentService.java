package com.parking.location.service;

import com.parking.location.config.CurrencyConfig;
import com.parking.location.dto.PaymentResponse;
import com.parking.location.model.Payment;
import com.parking.location.model.PaymentStatus;
import com.parking.location.model.Reservation;
import com.parking.location.model.ReservationStatus;
import com.parking.location.repository.PaymentRepository;
import com.parking.location.repository.ReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Transactional
    public PaymentResponse processPayment(Long reservationId, String userEmail) {
        if (reservationId == null) {
            throw new RuntimeException("Reservation id is required");
        }

        Reservation reservation = reservationRepository.findByIdWithUserAndParking(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (!reservation.getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("You cannot pay for someone else's reservation");
        }

        if (!reservation.getUser().isActive()) {
            throw new RuntimeException("Your account is deactivated");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new RuntimeException("Cannot pay for a cancelled reservation");
        }

        if (reservation.getStatus() == ReservationStatus.CONFIRMED) {
            throw new RuntimeException("Reservation already confirmed");
        }

        // Empêche les doubles paiements sur la même réservation
        if (paymentRepository.existsByReservation_IdAndStatus(reservationId, PaymentStatus.PAID)) {
            throw new RuntimeException("Payment already completed for this reservation");
        }

        // Arrondi à l'heure supérieure pour aligner la facturation avec l'historique.
        long minutes = Duration.between(reservation.getStartTime(), reservation.getEndTime()).toMinutes();
        long hours = Math.max(1L, (long) Math.ceil(Math.max(0L, minutes) / 60.0));

        double totalAmount = hours * reservation.getParking().getPricePerHour();

        // Créer l'enregistrement du paiement
        Payment payment = new Payment();
        payment.setReservation(reservation);
        payment.setAmount(totalAmount);
        payment.setStatus(PaymentStatus.PAID);

        Payment savedPayment = paymentRepository.save(payment);

        // Paiement réussi -> réservation confirmée
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservationRepository.save(reservation);

        return toPaymentResponse(savedPayment);
    }
    
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentDetails(Long paymentId, String userEmail, boolean isAdmin) {
        Payment payment = paymentRepository.findByIdWithReservationAndUser(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!isAdmin && !payment.getReservation().getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("You are not authorized to view this payment");
        }

        return toPaymentResponse(payment);
    }

    private PaymentResponse toPaymentResponse(Payment payment) {
        Reservation reservation = payment.getReservation();

        return new PaymentResponse(
                payment.getId(),
                reservation.getId(),
                reservation.getParking() != null ? reservation.getParking().getId() : null,
                reservation.getParking() != null ? reservation.getParking().getName() : null,
                reservation.getUser() != null ? reservation.getUser().getId() : null,
                reservation.getUser() != null ? reservation.getUser().getEmail() : null,
                payment.getAmount(),
                CurrencyConfig.CURRENCY_CODE,
                payment.getStatus().name()
        );
    }
}