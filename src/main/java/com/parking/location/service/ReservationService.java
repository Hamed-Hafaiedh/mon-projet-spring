package com.parking.location.service;

import com.parking.location.dto.ReservationHistoryResponse;
import com.parking.location.dto.ReservationRequest;
import com.parking.location.model.PaymentStatus;
import com.parking.location.model.Parking;
import com.parking.location.model.Payment;
import com.parking.location.model.Reservation;
import com.parking.location.model.ReservationStatus;
import com.parking.location.model.User;
import com.parking.location.repository.PaymentRepository;
import com.parking.location.repository.ParkingRepository;
import com.parking.location.repository.ReservationRepository;
import com.parking.location.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReservationService {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ParkingRepository parkingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Transactional
    public Reservation createReservation(ReservationRequest request, String userEmail) {
        if (request.getParkingId() == null || request.getStartTime() == null || request.getEndTime() == null) {
            throw new RuntimeException("Missing required reservation fields");
        }
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new RuntimeException("End time must be after start time");
        }
        if (request.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Start time must be in the future");
        }

        User user = userRepository.findByEmailAndActiveTrue(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Parking parking = parkingRepository.findById(request.getParkingId())
                .orElseThrow(() -> new RuntimeException("Parking not found"));

        long overlappingReservations = reservationRepository.countOverlappingActiveReservations(
                parking.getId(),
                request.getStartTime(),
                request.getEndTime()
        );
        if (overlappingReservations >= parking.getTotalSpots()) {
            throw new RuntimeException("No available spots for this time slot");
        }

        // Règle métier : Une place ne peut pas être réservée si elle est indisponible
        if (parking.getAvailableSpots() <= 0) {
            throw new RuntimeException("No available spots in this parking");
        }

        // Décrémenter les places disponibles
        parking.setAvailableSpots(parking.getAvailableSpots() - 1);
        parkingRepository.save(parking);

        // Créer la réservation
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setParking(parking);
        reservation.setStartTime(request.getStartTime());
        reservation.setEndTime(request.getEndTime());
        // Une réservation doit être payée pour devenir confirmée
        reservation.setStatus(ReservationStatus.PENDING);

        return reservationRepository.save(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationHistoryResponse> getUserReservations(String userEmail) {
        User user = userRepository.findByEmailAndActiveTrue(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Reservation> reservations = reservationRepository.findByUserOrderByStartTimeDescIdDesc(user);

        return reservations.stream().map(reservation -> {
            if (reservation.getParking() == null || reservation.getStartTime() == null || reservation.getEndTime() == null) {
                return new ReservationHistoryResponse(
                        reservation.getId(),
                        null,
                        "Parking inconnu",
                        "-",
                        0.0,
                        reservation.getStartTime(),
                        reservation.getEndTime(),
                        reservation.getStatus() != null ? reservation.getStatus().name() : "PENDING",
                        0.0,
                        false
                );
            }

            long minutes = Duration.between(reservation.getStartTime(), reservation.getEndTime()).toMinutes();
            long billableHours = Math.max(1L, (long) Math.ceil(Math.max(0L, minutes) / 60.0));
            double totalPrice = billableHours * reservation.getParking().getPricePerHour();
            boolean paid = paymentRepository
                    .findByReservation_Id(reservation.getId())
                    .map(payment -> payment.getStatus() == PaymentStatus.PAID)
                    .orElse(false);

            return new ReservationHistoryResponse(
                    reservation.getId(),
                    reservation.getParking().getId(),
                    reservation.getParking().getName(),
                    reservation.getParking().getLocation(),
                    reservation.getParking().getPricePerHour(),
                    reservation.getStartTime(),
                    reservation.getEndTime(),
                    reservation.getStatus().name(),
                    totalPrice,
                    paid
            );
        }).toList();
    }

    @Transactional
    public void cancelReservation(Long reservationId, String userEmail) {
        Reservation reservation = reservationRepository.findByIdWithUserAndParking(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        // Vérifier que la réservation appartient bien à l'utilisateur qui l'annule
        if (!reservation.getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("You are not authorized to cancel this reservation");
        }

        // Règle métier : Une réservation peut être annulée avant son début
        if (reservation.getStartTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot cancel a reservation that has already started");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new RuntimeException("Reservation is already cancelled");
        }

        Payment payment = paymentRepository.findByReservation_Id(reservationId).orElse(null);
        if (payment != null && payment.getStatus() == PaymentStatus.PAID) {
            throw new RuntimeException("Cannot cancel a reservation that is already paid");
        }

        // Marquer comme annulée
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // Rendre la place au parking
        Parking parking = reservation.getParking();
        parking.setAvailableSpots(parking.getAvailableSpots() + 1);
        parkingRepository.save(parking);
    }
}
