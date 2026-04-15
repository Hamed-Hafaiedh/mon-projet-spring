package com.parking.location.dto;

import lombok.Data;

@Data
public class AdminUserCreateRequest {
    private String name;
    private String email;
    private String password;
    private String role;
}

