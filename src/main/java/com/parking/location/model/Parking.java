package com.parking.location.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "parkings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Parking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    private String location;
    
    private int totalSpots;
    
    private int availableSpots;
    
    private double pricePerHour;

    private Double latitude;

    private Double longitude;
}