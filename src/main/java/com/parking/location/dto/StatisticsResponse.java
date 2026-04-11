package com.parking.location.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatisticsResponse {
    private long totalUsers;
    private long inactiveUsers;
    private long totalParkings;
    private long totalReservations;
    private double totalRevenue;
}
