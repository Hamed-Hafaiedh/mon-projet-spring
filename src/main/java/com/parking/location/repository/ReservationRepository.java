package com.parking.location.repository;

import com.parking.location.model.Reservation;
import com.parking.location.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    @Query("SELECT r FROM Reservation r JOIN FETCH r.user JOIN FETCH r.parking WHERE r.id = :id")
    Optional<Reservation> findByIdWithUserAndParking(@Param("id") Long id);

    List<Reservation> findByUser(User user);
    List<Reservation> findByParkingId(Long parkingId);
    List<Reservation> findByUserOrderByStartTimeDescIdDesc(User user);
    @Query("""
            SELECT COUNT(r) FROM Reservation r
            WHERE r.parking.id = :parkingId
              AND r.status <> com.parking.location.model.ReservationStatus.CANCELLED
              AND r.startTime < :endTime
              AND r.endTime > :startTime
            """)
    long countOverlappingActiveReservations(@Param("parkingId") Long parkingId,
                                            @Param("startTime") LocalDateTime startTime,
                                            @Param("endTime") LocalDateTime endTime);
    long countByUser_Id(Long userId);
    long countByParkingId(Long parkingId);
    long deleteByUser_Id(Long userId);
}
