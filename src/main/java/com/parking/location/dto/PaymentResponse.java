package com.parking.location.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentResponse {
    private Long id;
    private Long reservationId;
    private Long parkingId;
    private String parkingName;
    private Long userId;
    private String userEmail;
    private double amount;
    private String currencyCode;
    private String status;
}

