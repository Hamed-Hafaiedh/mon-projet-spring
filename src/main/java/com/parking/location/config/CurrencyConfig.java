package com.parking.location.config;

/**
 * Configuration de la devise de l'application
 */
public class CurrencyConfig {
    
    public static final String CURRENCY_CODE = "TND";
    public static final String CURRENCY_SYMBOL = "د.ت";
    public static final String CURRENCY_DISPLAY = "TND";
    
    /**
     * Formate un montant avec la devise
     */
    public static String formatPrice(double amount) {
        return String.format("%.2f %s", amount, CURRENCY_DISPLAY);
    }
}

