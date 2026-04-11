package com.parking.location.controller;

import com.parking.location.dto.JwtResponse;
import com.parking.location.dto.LoginRequest;
import com.parking.location.dto.MessageResponse;
import com.parking.location.dto.SignupRequest;
import com.parking.location.model.Role;
import com.parking.location.model.User;
import com.parking.location.repository.UserRepository;
import com.parking.location.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            org.springframework.security.core.userdetails.User userDetails =
                    (org.springframework.security.core.userdetails.User) authentication.getPrincipal();

            User user = userRepository.findByEmailAndActiveTrue(userDetails.getUsername())
                    .orElse(null);

            if (user == null) {
                // User not found or not active
                return ResponseEntity.status(401).body(new MessageResponse("Error: invalid credentials or inactive user"));
            }

            return ResponseEntity.ok(new JwtResponse(jwt,
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getRole().name()));
        } catch (AuthenticationException ex) {
            // Authentication failed (bad credentials, etc.)
            return ResponseEntity.status(401).body(new MessageResponse("Error: invalid credentials"));
        } catch (Exception ex) {
            // Unexpected error
            return ResponseEntity.status(500).body(new MessageResponse("Internal server error"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        // Create new user's account
        User user = new User();
        user.setName(signUpRequest.getName());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));
        
        // assign default role ADMIN/USER? Defaulting to USER
        user.setRole(Role.USER);
        user.setActive(true);

        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}
