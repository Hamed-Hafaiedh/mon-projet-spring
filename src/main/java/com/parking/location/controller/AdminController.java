package com.parking.location.controller;

import com.parking.location.dto.AdminUserCreateRequest;
import com.parking.location.dto.AdminUserResponse;
import com.parking.location.dto.AdminUserUpdateRequest;
import com.parking.location.dto.MessageResponse;
import com.parking.location.dto.StatisticsResponse;
import com.parking.location.service.AdminExportService;
import com.parking.location.model.Role;
import com.parking.location.model.User;
import com.parking.location.model.Parking;
import com.parking.location.model.Reservation;
import com.parking.location.model.ReservationStatus;
import com.parking.location.repository.ParkingRepository;
import com.parking.location.repository.PaymentRepository;
import com.parking.location.repository.ReservationRepository;
import com.parking.location.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParkingRepository parkingRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AdminExportService adminExportService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        List<AdminUserResponse> users = userRepository.findAll().stream()
                .map(user -> new AdminUserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.isActive()))
                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(new AdminUserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.isActive()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody AdminUserCreateRequest request) {
        if (request.getName() == null || request.getName().isBlank()
                || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Name, email and password are required"));
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(normalizedEmail)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Email is already in use"));
        }

        Role role;
        try {
            role = parseRole(request.getRole());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setActive(true);

        User saved = userRepository.save(user);
        return ResponseEntity.ok(new AdminUserResponse(saved.getId(), saved.getName(), saved.getEmail(), saved.getRole().name(), saved.isActive()));
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody AdminUserUpdateRequest request) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
            if (userRepository.existsByEmailAndIdNot(normalizedEmail, id)) {
                return ResponseEntity.badRequest().body(new MessageResponse("Email is already in use"));
            }
            user.setEmail(normalizedEmail);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null && !request.getRole().isBlank()) {
            try {
                user.setRole(parseRole(request.getRole()));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
            }
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(new AdminUserResponse(saved.getId(), saved.getName(), saved.getEmail(), saved.getRole().name(), saved.isActive()));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Empêche un admin de supprimer son propre compte par erreur.
        if (authentication != null && user.getEmail().equalsIgnoreCase(authentication.getName())) {
            return ResponseEntity.badRequest().body(new MessageResponse("You cannot delete your own account"));
        }

        if (!user.isActive()) {
            return ResponseEntity.badRequest().body(new MessageResponse("User is already deactivated"));
        }

        deactivateUserReservations(user);
        user.setActive(false);
        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("User deactivated successfully"));
    }

    @PatchMapping("/users/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reactivateUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (user.isActive()) {
            return ResponseEntity.badRequest().body(new MessageResponse("User is already active"));
        }

        user.setActive(true);
        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("User reactivated successfully"));
    }

    @DeleteMapping("/users/{id}/permanent")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> permanentlyDeleteUser(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Empêche un admin de supprimer définitivement son propre compte.
        if (authentication != null && user.getEmail().equalsIgnoreCase(authentication.getName())) {
            return ResponseEntity.badRequest().body(new MessageResponse("You cannot permanently delete your own account"));
        }

        deactivateUserReservations(user);
        paymentRepository.deleteByReservation_User_Id(id);
        reservationRepository.deleteByUser_Id(id);
        userRepository.delete(user);
        return ResponseEntity.ok(new MessageResponse("User permanently deleted successfully"));
    }

    private void deactivateUserReservations(User user) {
        List<Reservation> reservations = reservationRepository.findByUser(user);
        for (Reservation reservation : reservations) {
            if (reservation.getStatus() == ReservationStatus.CANCELLED) {
                continue;
            }

            reservation.setStatus(ReservationStatus.CANCELLED);

            Parking parking = reservation.getParking();
            if (parking != null) {
                int updatedSpots = Math.min(parking.getTotalSpots(), parking.getAvailableSpots() + 1);
                parking.setAvailableSpots(updatedSpots);
                parkingRepository.save(parking);
            }

            reservationRepository.save(reservation);
        }
    }

    @GetMapping("/reservations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllReservations() {
        return ResponseEntity.ok(reservationRepository.findAll());
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StatisticsResponse> getDashboardStatistics() {
        long totalUsers = userRepository.countByActiveTrue();
        long inactiveUsers = userRepository.countByActiveFalse();
        long totalParkings = parkingRepository.count();
        long totalReservations = reservationRepository.count();
        
        Double totalRevenue = paymentRepository.calculateTotalRevenue();
        if (totalRevenue == null) {
            totalRevenue = 0.0;
        }

        StatisticsResponse stats = new StatisticsResponse(totalUsers, inactiveUsers, totalParkings, totalReservations, totalRevenue);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/exports/users.csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportUsersCsv() {
        String csv = adminExportService.exportUsersCsv();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=users.csv")
                .body(csv);
    }

    @GetMapping("/exports/reservations.csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportReservationsCsv() {
        String csv = adminExportService.exportReservationsCsv();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reservations.csv")
                .body(csv);
    }

    @GetMapping("/exports/statistics.csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportStatisticsCsv() {
        String csv = adminExportService.exportStatisticsCsv();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=statistics.csv")
                .body(csv);
    }

    private Role parseRole(String roleValue) {
        if (roleValue == null || roleValue.isBlank()) {
            return Role.USER;
        }
        try {
            return Role.valueOf(roleValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role. Use USER or ADMIN");
        }
    }
}
