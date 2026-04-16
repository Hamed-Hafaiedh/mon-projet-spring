package com.parking.location.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ReservationTest {

    @Test
    void testReservationInstantiation() {
        Reservation reservation = new Reservation();
        assertNotNull(reservation);
    }
}
