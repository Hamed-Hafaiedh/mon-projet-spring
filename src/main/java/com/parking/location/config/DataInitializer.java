package com.parking.location.config;

import com.parking.location.model.Role;
import com.parking.location.model.User;
import com.parking.location.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        migrateReservationStatusColumn();
        migrateUserActiveColumn();

        String adminEmail = "admin@parking.com";
        Optional<User> adminOpt = userRepository.findByEmail(adminEmail);
        
        if (adminOpt.isPresent()) {
            User admin = adminOpt.get();
            boolean changed = false;
            if (admin.getRole() != Role.ADMIN) {
                admin.setRole(Role.ADMIN);
                changed = true;
            }
            if (!admin.isActive()) {
                admin.setActive(true);
                changed = true;
            }
            if (changed) {
                userRepository.save(admin);
                System.out.println("COMPTE MIS A JOUR : admin@parking.com est maintenant ADMIN et actif !");
            }
        } else {
            // Création de l'admin s'il n'existe pas
            User newAdmin = new User();
            newAdmin.setName("Super Admin");
            newAdmin.setEmail(adminEmail);
            newAdmin.setPassword(passwordEncoder.encode("password123"));
            newAdmin.setRole(Role.ADMIN);
            newAdmin.setActive(true);
            userRepository.save(newAdmin);
            System.out.println("COMPTE CREE : admin@parking.com (mdp: password123) avec le role ADMIN !");
        }
    }

    private void migrateReservationStatusColumn() {
        try {
            // Evite les erreurs MySQL ENUM quand les statuts Java evoluent (ACTIVE -> PENDING/CONFIRMED).
            jdbcTemplate.execute("ALTER TABLE reservations MODIFY COLUMN status VARCHAR(20)");
        } catch (Exception ignored) {
            // La migration est best-effort pour rester compatible avec des schemas differents.
        }
    }

    private void migrateUserActiveColumn() {
        try {
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN active BIT(1) NOT NULL DEFAULT b'1'");
        } catch (Exception ignored) {
            // Si la colonne existe deja, on continue.
        }

        try {
            jdbcTemplate.execute("UPDATE users SET active = b'1' WHERE active IS NULL");
        } catch (Exception ignored) {
            // Best-effort.
        }
    }
}
