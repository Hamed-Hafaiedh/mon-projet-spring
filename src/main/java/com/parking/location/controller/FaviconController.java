package com.parking.location.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FaviconController {

    @GetMapping("/favicon.ico")
    public ResponseEntity<Void> favicon() {
        // Retourne 204 No Content pour éviter une erreur 500 lorsqu'aucun favicon n'est présent
        return ResponseEntity.noContent().build();
    }
}

