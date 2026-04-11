package com.parking.location.controller;

import com.parking.location.dto.MessageResponse;
import com.parking.location.model.Reservation;
import com.parking.location.model.Role;
import com.parking.location.model.User;
import com.parking.location.repository.ParkingRepository;
import com.parking.location.repository.PaymentRepository;
import com.parking.location.repository.ReservationRepository;
import com.parking.location.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ParkingRepository parkingRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminController adminController;

    @Test
    void deleteUser_shouldReturnNotFoundWhenUserMissing() {
        Long userId = 10L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        ResponseEntity<?> response = adminController.deleteUser(userId, null);

        assertEquals(404, response.getStatusCode().value());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void deleteUser_shouldRejectSelfDeactivation() {
        Long userId = 11L;
        User admin = buildUser(userId, "admin@parking.com", true);
        Authentication authentication = new TestingAuthenticationToken("admin@parking.com", "password");
        when(userRepository.findById(userId)).thenReturn(Optional.of(admin));

        ResponseEntity<?> response = adminController.deleteUser(userId, authentication);

        assertEquals(400, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("You cannot delete your own account", body.getMessage());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void deleteUser_shouldSoftDeleteActiveUser() {
        Long userId = 12L;
        User user = buildUser(userId, "client@parking.com", true);
        Authentication authentication = new TestingAuthenticationToken("admin@parking.com", "password");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ResponseEntity<?> response = adminController.deleteUser(userId, authentication);

        assertEquals(200, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("User deactivated successfully", body.getMessage());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertFalse(userCaptor.getValue().isActive());
        verify(userRepository, never()).delete(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void deleteUser_shouldRejectWhenAlreadyDeactivated() {
        Long userId = 13L;
        User user = buildUser(userId, "inactive@parking.com", false);
        Authentication authentication = new TestingAuthenticationToken("admin@parking.com", "password");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ResponseEntity<?> response = adminController.deleteUser(userId, authentication);

        assertEquals(400, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("User is already deactivated", body.getMessage());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void reactivateUser_shouldReturnNotFoundWhenUserMissing() {
        Long userId = 14L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        ResponseEntity<?> response = adminController.reactivateUser(userId);

        assertEquals(404, response.getStatusCode().value());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void reactivateUser_shouldRejectWhenAlreadyActive() {
        Long userId = 15L;
        User user = buildUser(userId, "already@parking.com", true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ResponseEntity<?> response = adminController.reactivateUser(userId);

        assertEquals(400, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("User is already active", body.getMessage());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any(User.class));
    }

    @Test
    void reactivateUser_shouldActivateInactiveUser() {
        Long userId = 16L;
        User user = buildUser(userId, "inactive@parking.com", false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ResponseEntity<?> response = adminController.reactivateUser(userId);

        assertEquals(200, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("User reactivated successfully", body.getMessage());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertTrue(userCaptor.getValue().isActive());
    }

    @Test
    void getAllReservations_shouldReturnRepositoryData() {
        List<Reservation> expectedReservations = List.of(new Reservation());
        when(reservationRepository.findAll()).thenReturn(expectedReservations);

        ResponseEntity<?> response = adminController.getAllReservations();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(expectedReservations, response.getBody());
    }

    @Test
    void permanentlyDeleteUser_shouldDeleteUserWhenExists() {
        Long userId = 20L;
        User user = buildUser(userId, "client@parking.com", false);
        Authentication authentication = new TestingAuthenticationToken("admin@parking.com", "password");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ResponseEntity<?> response = adminController.permanentlyDeleteUser(userId, authentication);

        assertEquals(200, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("User permanently deleted successfully", body.getMessage());
        verify(userRepository).delete(user);
    }

    @Test
    void permanentlyDeleteUser_shouldRejectSelfDeletion() {
        Long userId = 21L;
        User admin = buildUser(userId, "admin@parking.com", true);
        Authentication authentication = new TestingAuthenticationToken("admin@parking.com", "password");
        when(userRepository.findById(userId)).thenReturn(Optional.of(admin));

        ResponseEntity<?> response = adminController.permanentlyDeleteUser(userId, authentication);

        assertEquals(400, response.getStatusCode().value());
        MessageResponse body = (MessageResponse) response.getBody();
        assertNotNull(body);
        assertEquals("You cannot permanently delete your own account", body.getMessage());
        verify(userRepository, never()).delete(org.mockito.ArgumentMatchers.any(User.class));
    }

    private User buildUser(Long id, String email, boolean active) {
        User user = new User();
        user.setId(id);
        user.setName("Test User");
        user.setEmail(email);
        user.setPassword("encoded");
        user.setRole(Role.USER);
        user.setActive(active);
        return user;
    }
}



