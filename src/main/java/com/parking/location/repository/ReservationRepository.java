package com.parking.location.repository;

import com.parking.location.model.Reservation;
import com.parking.location.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUser(User user);
    List<Reservation> findByParkingId(Long parkingId);
    List<Reservation> findByUserOrderByStartTimeDescIdDesc(User user);
    long countByUser_Id(Long userId);
    long countByParkingId(Long parkingId);
    long deleteByUser_Id(Long userId);
}
