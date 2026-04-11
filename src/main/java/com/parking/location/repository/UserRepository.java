package com.parking.location.repository;

import com.parking.location.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndActiveTrue(String email);
    Boolean existsByEmail(String email);
    Boolean existsByEmailAndIdNot(String email, Long id);
    long countByActiveTrue();
    long countByActiveFalse();
}
