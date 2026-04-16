package com.parking.location.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PaymentTest {

    @Test
    void testPaymentInstantiation() {
        Payment payment = new Payment();
        assertNotNull(payment);
    }
}
