package com.parking.location.config;

import com.parking.location.model.Role;
import com.parking.location.model.User;
import com.parking.location.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

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
        if (!isMySql()) {
            return;
        }

        try {
            // Evite les erreurs MySQL ENUM quand les statuts Java evoluent (ACTIVE -> PENDING/CONFIRMED).
            jdbcTemplate.execute("ALTER TABLE reservations MODIFY COLUMN status VARCHAR(20)");
        } catch (Exception e) {
            System.err.println("Migration status reservations non appliquee: " + e.getMessage());
        }
    }

    private void migrateUserActiveColumn() {
        if (!columnExists("users", "active")) {
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN active BIT(1) NOT NULL DEFAULT b'1'");
            } catch (Exception e) {
                System.err.println("Migration colonne users.active non appliquee: " + e.getMessage());
            }
        }

        try {
            jdbcTemplate.execute("UPDATE users SET active = b'1' WHERE active IS NULL");
        } catch (Exception e) {
            System.err.println("Initialisation users.active impossible: " + e.getMessage());
        }
    }

    private boolean isMySql() {
        try (Connection connection = dataSource.getConnection()) {
            String productName = connection.getMetaData().getDatabaseProductName();
            return productName != null && productName.toLowerCase().contains("mysql");
        } catch (SQLException e) {
            return false;
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        try (Connection connection = dataSource.getConnection();
             ResultSet columns = connection.getMetaData().getColumns(null, null, tableName, columnName)) {
            return columns.next();
        } catch (SQLException e) {
            return false;
        }
    }
}
