package com.parking.location.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReservationRequest {
    private Long parkingId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
