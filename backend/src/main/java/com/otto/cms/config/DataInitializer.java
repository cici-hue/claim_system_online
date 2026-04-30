package com.otto.cms.config;

import com.otto.cms.entity.User;
import com.otto.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner initUsers() {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setFullname("System Administrator");
                admin.setEmail("admin@otto.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole(User.Role.SUPERADMIN);
                admin.setTeam("QC");
                admin.setFactoryAgent("HQ");
                userRepository.save(admin);

                User inspector = new User();
                inspector.setUsername("inspector");
                inspector.setFullname("Test Inspector");
                inspector.setEmail("inspector@otto.com");
                inspector.setPassword(passwordEncoder.encode("inspector123"));
                inspector.setRole(User.Role.INSPECTOR);
                inspector.setTeam("QC");
                inspector.setFactoryAgent("Factory A");
                userRepository.save(inspector);

                System.out.println("========================================");
                System.out.println("Default users created:");
                System.out.println("  Username: admin, Password: admin123 (SUPERADMIN)");
                System.out.println("  Username: inspector, Password: inspector123 (INSPECTOR)");
                System.out.println("========================================");
            }
        };
    }
}
