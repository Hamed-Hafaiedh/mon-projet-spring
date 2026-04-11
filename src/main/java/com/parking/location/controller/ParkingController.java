package com.parking.location.controller;

import com.parking.location.dto.MessageResponse;
import com.parking.location.dto.ParkingNearbyResponse;
import com.parking.location.model.Parking;
import com.parking.location.service.ParkingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/parkings")
public class ParkingController {

    @Autowired
    private ParkingService parkingService;

    // Tout le monde peut voir la liste des parkings (utilisateurs connectés)
    @GetMapping
    public List<Parking> getAllParkings() {
        return parkingService.getAllParkings();
    }

    // Tout le monde peut voir les détails d'un parking
    @GetMapping("/{id}")
    public ResponseEntity<Parking> getParkingById(@PathVariable Long id) {
        return parkingService.getParkingById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<ParkingNearbyResponse>> getNearbyParkings(@RequestParam("lat") double latitude,
                                                                          @RequestParam("lng") double longitude,
                                                                          @RequestParam(value = "radiusKm", required = false) Double radiusKm,
                                                                          @RequestParam(value = "limit", required = false) Integer limit,
                                                                          @RequestParam(value = "availableOnly", defaultValue = "false") boolean availableOnly) {
        return ResponseEntity.ok(parkingService.getNearbyParkings(latitude, longitude, radiusKm, limit, availableOnly));
    }

    // Seul l'ADMIN peut ajouter un parking
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Parking createParking(@RequestBody Parking parking) {
        return parkingService.createParking(parking);
    }

    // Seul l'ADMIN peut modifier un parking
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Parking> updateParking(@PathVariable Long id, @RequestBody Parking parkingDetails) {
        Parking updatedParking = parkingService.updateParking(id, parkingDetails);
        if (updatedParking != null) {
            return ResponseEntity.ok(updatedParking);
        }
        return ResponseEntity.notFound().build();
    }

    // Seul l'ADMIN peut supprimer un parking
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteParking(@PathVariable Long id) {
        parkingService.deleteParking(id);
        return ResponseEntity.ok(new MessageResponse("Parking deleted successfully"));
    }
}
