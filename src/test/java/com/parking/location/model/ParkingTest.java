package com.parking.location.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ParkingTest {

    @Test
    void testParkingInstantiation() {
        Parking parking = new Parking();
        assertNotNull(parking);
    }
}
