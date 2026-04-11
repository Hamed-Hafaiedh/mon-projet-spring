package com.parking.location.service;

import com.parking.location.dto.StatisticsResponse;
import com.parking.location.model.Reservation;
import com.parking.location.model.User;
import com.parking.location.repository.ParkingRepository;
import com.parking.location.repository.PaymentRepository;
import com.parking.location.repository.ReservationRepository;
import com.parking.location.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AdminExportService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ParkingRepository parkingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public String exportUsersCsv() {
        List<User> users = userRepository.findAll();
        StringBuilder csv = new StringBuilder();
        csv.append("id,name,email,role,active\n");

        for (User user : users) {
            csv.append(user.getId()).append(',')
                    .append(escapeCsv(user.getName())).append(',')
                    .append(escapeCsv(user.getEmail())).append(',')
                    .append(user.getRole() != null ? user.getRole().name() : "").append(',')
                    .append(user.isActive())
                    .append('\n');
        }

        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String exportReservationsCsv() {
        List<Reservation> reservations = reservationRepository.findAll();
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        StringBuilder csv = new StringBuilder();
        csv.append("id,userId,userEmail,parkingId,parkingName,startTime,endTime,status\n");

        for (Reservation reservation : reservations) {
            Long userId = reservation.getUser() != null ? reservation.getUser().getId() : null;
            String userEmail = reservation.getUser() != null ? reservation.getUser().getEmail() : "";
            Long parkingId = reservation.getParking() != null ? reservation.getParking().getId() : null;
            String parkingName = reservation.getParking() != null ? reservation.getParking().getName() : "";

            csv.append(reservation.getId()).append(',')
                    .append(userId != null ? userId : "").append(',')
                    .append(escapeCsv(userEmail)).append(',')
                    .append(parkingId != null ? parkingId : "").append(',')
                    .append(escapeCsv(parkingName)).append(',')
                    .append(reservation.getStartTime() != null ? reservation.getStartTime().format(dateTimeFormatter) : "").append(',')
                    .append(reservation.getEndTime() != null ? reservation.getEndTime().format(dateTimeFormatter) : "").append(',')
                    .append(reservation.getStatus() != null ? reservation.getStatus().name() : "")
                    .append('\n');
        }

        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String exportStatisticsCsv() {
        long totalUsers = userRepository.countByActiveTrue();
        long inactiveUsers = userRepository.countByActiveFalse();
        long totalParkings = parkingRepository.count();
        long totalReservations = reservationRepository.count();
        Double totalRevenue = paymentRepository.calculateTotalRevenue();
        if (totalRevenue == null) {
            totalRevenue = 0.0;
        }

        StatisticsResponse stats = new StatisticsResponse(totalUsers, inactiveUsers, totalParkings, totalReservations, totalRevenue);

        StringBuilder csv = new StringBuilder();
        csv.append("totalUsers,inactiveUsers,totalParkings,totalReservations,totalRevenue\n");
        csv.append(stats.getTotalUsers()).append(',')
                .append(stats.getInactiveUsers()).append(',')
                .append(stats.getTotalParkings()).append(',')
                .append(stats.getTotalReservations()).append(',')
                .append(stats.getTotalRevenue()).append('\n');

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\r")) {
            return "\"" + escaped + "\"";
        }

        return escaped;
    }
}

