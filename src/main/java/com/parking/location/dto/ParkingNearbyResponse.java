package com.parking.location.dto;

public record ParkingNearbyResponse(
        Long parkingId,
        String name,
        String location,
        int availableSpots,
        int totalSpots,
        double pricePerHour,
        Double latitude,
        Double longitude,
        double distanceKm
) {
}

