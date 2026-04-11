package com.parking.location.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ReservationHistoryResponse {
    private Long id;
    private Long parkingId;
    private String parkingName;
    private String parkingLocation;
    private double pricePerHour;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private double totalPrice;
    private boolean paid;
}

