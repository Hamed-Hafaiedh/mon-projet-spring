package com.parking.location.repository;

import com.parking.location.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    boolean existsByReservation_IdAndStatus(Long reservationId, com.parking.location.model.PaymentStatus status);
    java.util.Optional<Payment> findByReservation_Id(Long reservationId);
    long deleteByReservation_User_Id(Long userId);
    
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.status = 'PAID'")
    Double calculateTotalRevenue();
}
