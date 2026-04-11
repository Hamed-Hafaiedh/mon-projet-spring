package com.parking.location.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private Long reservationId;
    // On pourrait rajouter des infos de carte bancaire factices ici, mais on garde simple
}
