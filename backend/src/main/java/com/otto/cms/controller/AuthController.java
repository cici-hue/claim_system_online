package com.otto.cms.controller;

import com.otto.cms.dto.LoginRequest;
import com.otto.cms.dto.LoginResponse;
import com.otto.cms.entity.User;
import com.otto.cms.repository.UserRepository;
import com.otto.cms.security.JwtTokenProvider;
import com.otto.cms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        String token = jwtTokenProvider.generateToken(auth);
        User user = userRepository.findByUsername(req.getUsername()).orElseThrow();
        auditLogService.log("LOGIN", "User logged in");
        return ResponseEntity.ok(new LoginResponse(
                token, user.getUsername(), user.getFullname(),
                user.getRole().name(), user.getTeam(), user.getFactoryAgent()
        ));
    }
}
