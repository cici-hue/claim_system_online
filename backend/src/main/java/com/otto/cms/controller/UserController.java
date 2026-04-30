package com.otto.cms.controller;

import com.otto.cms.dto.*;
import com.otto.cms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public List<UserDTO> list() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public UserDTO get(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<UserDTO> create(@RequestBody Map<String, Object> body) {
        UserDTO dto = new UserDTO();
        dto.setUsername((String) body.get("username"));
        dto.setFullname((String) body.get("fullname"));
        dto.setEmail((String) body.get("email"));
        dto.setTeam((String) body.get("team"));
        dto.setFactoryAgent((String) body.get("factoryAgent"));
        String roleStr = (String) body.get("role");
        if (roleStr != null) dto.setRole(com.otto.cms.entity.User.Role.valueOf(roleStr.toUpperCase()));
        String rawPassword = (String) body.get("password");
        return ResponseEntity.ok(userService.create(dto, rawPassword));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public UserDTO update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        UserDTO dto = new UserDTO();
        dto.setFullname((String) body.get("fullname"));
        dto.setEmail((String) body.get("email"));
        dto.setTeam((String) body.get("team"));
        dto.setFactoryAgent((String) body.get("factoryAgent"));
        String roleStr = (String) body.get("role");
        if (roleStr != null) dto.setRole(com.otto.cms.entity.User.Role.valueOf(roleStr.toUpperCase()));
        String rawPassword = (String) body.get("password");
        return userService.update(id, dto, rawPassword);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
