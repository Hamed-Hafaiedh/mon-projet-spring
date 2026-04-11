package com.parking.location.service;

import com.parking.location.repository.ParkingRepository;
import com.parking.location.repository.ReservationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkingServiceTest {

    @Mock
    private ParkingRepository parkingRepository;

    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private ParkingService parkingService;

    @Test
    void deleteParking_shouldThrowWhenParkingDoesNotExist() {
        Long parkingId = 1L;
        when(parkingRepository.existsById(parkingId)).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> parkingService.deleteParking(parkingId));

        assertEquals("Parking introuvable", ex.getMessage());
        verify(parkingRepository, never()).deleteById(parkingId);
    }

    @Test
    void deleteParking_shouldThrowWhenReservationsExist() {
        Long parkingId = 2L;
        when(parkingRepository.existsById(parkingId)).thenReturn(true);
        when(reservationRepository.countByParkingId(parkingId)).thenReturn(3L);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> parkingService.deleteParking(parkingId));

        assertEquals("Impossible de supprimer ce parking car il a des reservations associees", ex.getMessage());
        verify(parkingRepository, never()).deleteById(parkingId);
    }

    @Test
    void deleteParking_shouldDeleteWhenNoReservations() {
        Long parkingId = 3L;
        when(parkingRepository.existsById(parkingId)).thenReturn(true);
        when(reservationRepository.countByParkingId(parkingId)).thenReturn(0L);

        parkingService.deleteParking(parkingId);

        verify(parkingRepository).deleteById(parkingId);
    }
}

