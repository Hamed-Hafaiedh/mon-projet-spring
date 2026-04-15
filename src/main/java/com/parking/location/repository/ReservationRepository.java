package com.parking.location.repository;

import com.parking.location.model.Reservation;
import com.parking.location.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    @Query("SELECT r FROM Reservation r JOIN FETCH r.user JOIN FETCH r.parking WHERE r.id = :id")
    Optional<Reservation> findByIdWithUserAndParking(@Param("id") Long id);

    List<Reservation> findByUser(User user);
    List<Reservation> findByParkingId(Long parkingId);
    List<Reservation> findByUserOrderByStartTimeDescIdDesc(User user);
    long countByUser_Id(Long userId);
    long countByParkingId(Long parkingId);
    long deleteByUser_Id(Long userId);
}
