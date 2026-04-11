package com.parking.location.service;

import com.parking.location.dto.ParkingNearbyResponse;
import com.parking.location.model.Parking;
import com.parking.location.repository.ParkingRepository;
import com.parking.location.repository.ReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ParkingService {

    @Autowired
    private ParkingRepository parkingRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    public List<Parking> getAllParkings() {
        return parkingRepository.findAll();
    }

    public Optional<Parking> getParkingById(Long id) {
        return parkingRepository.findById(id);
    }

    public Parking createParking(Parking parking) {
        validateParkingCoordinates(parking.getLatitude(), parking.getLongitude());
        // Au début, les places disponibles = places totales
        parking.setAvailableSpots(parking.getTotalSpots());
        return parkingRepository.save(parking);
    }

    public Parking updateParking(Long id, Parking parkingDetails) {
        Optional<Parking> optionalParking = parkingRepository.findById(id);
        
        if (optionalParking.isPresent()) {
            Parking existingParking = optionalParking.get();
            existingParking.setName(parkingDetails.getName());
            existingParking.setLocation(parkingDetails.getLocation());
            existingParking.setTotalSpots(parkingDetails.getTotalSpots());
            existingParking.setAvailableSpots(parkingDetails.getAvailableSpots());
            existingParking.setPricePerHour(parkingDetails.getPricePerHour());
            validateParkingCoordinates(parkingDetails.getLatitude(), parkingDetails.getLongitude());
            existingParking.setLatitude(parkingDetails.getLatitude());
            existingParking.setLongitude(parkingDetails.getLongitude());
            return parkingRepository.save(existingParking);
        }
        return null;
    }

    public List<ParkingNearbyResponse> getNearbyParkings(double userLatitude,
                                                         double userLongitude,
                                                         Double radiusKm,
                                                         Integer limit,
                                                         boolean availableOnly) {
        validateCoordinates(userLatitude, userLongitude, "Coordonnees utilisateur invalides");

        if (radiusKm != null && radiusKm <= 0) {
            throw new IllegalArgumentException("Le rayon doit etre superieur a 0");
        }

        int safeLimit = (limit == null || limit < 1) ? 10 : Math.min(limit, 100);

        return parkingRepository.findAll().stream()
                .filter(parking -> parking.getLatitude() != null && parking.getLongitude() != null)
                .filter(parking -> !availableOnly || parking.getAvailableSpots() > 0)
                .map(parking -> {
                    double distanceKm = calculateDistanceKm(userLatitude, userLongitude, parking.getLatitude(), parking.getLongitude());
                    return new ParkingNearbyResponse(
                            parking.getId(),
                            parking.getName(),
                            parking.getLocation(),
                            parking.getAvailableSpots(),
                            parking.getTotalSpots(),
                            parking.getPricePerHour(),
                            parking.getLatitude(),
                            parking.getLongitude(),
                            distanceKm
                    );
                })
                .filter(item -> radiusKm == null || item.distanceKm() <= radiusKm)
                .sorted(Comparator.comparingDouble(ParkingNearbyResponse::distanceKm))
                .limit(safeLimit)
                .toList();
    }

    public void deleteParking(Long id) {
        if (!parkingRepository.existsById(id)) {
            throw new RuntimeException("Parking introuvable");
        }

        if (reservationRepository.countByParkingId(id) > 0) {
            throw new RuntimeException("Impossible de supprimer ce parking car il a des reservations associees");
        }

        parkingRepository.deleteById(id);
    }

    private void validateParkingCoordinates(Double latitude, Double longitude) {
        if (latitude == null && longitude == null) {
            return;
        }

        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Latitude et longitude doivent etre renseignees ensemble");
        }

        validateCoordinates(latitude, longitude, "Coordonnees du parking invalides");
    }

    private void validateCoordinates(double latitude, double longitude, String errorMessage) {
        boolean isLatitudeValid = latitude >= -90 && latitude <= 90;
        boolean isLongitudeValid = longitude >= -180 && longitude <= 180;
        if (!isLatitudeValid || !isLongitudeValid) {
            throw new IllegalArgumentException(errorMessage);
        }
    }

    private double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusKm = 6371.0;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }
}
