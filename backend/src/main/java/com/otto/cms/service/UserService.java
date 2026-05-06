package com.otto.cms.service;

import com.otto.cms.dto.UserDTO;
import com.otto.cms.entity.User;
import com.otto.cms.exception.BusinessException;
import com.otto.cms.exception.ResourceNotFoundException;
import com.otto.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public List<UserDTO> findAll() {
        return userRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public UserDTO findById(Long id) {
        return toDto(userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id)));
    }

    public UserDTO create(UserDTO dto, String rawPassword) {
        if (userRepository.existsByUsername(dto.getUsername()))
            throw new BusinessException("Username already taken: " + dto.getUsername());
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setFullname(dto.getFullname());
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(dto.getRole() != null ? dto.getRole() : User.Role.INSPECTOR);
        user.setTeam(dto.getTeam());
        user.setFactoryAgent(dto.getFactoryAgent());
        auditLogService.log("ADD_USER", "Created user " + dto.getUsername());
        return toDto(userRepository.save(user));
    }

    public UserDTO update(Long id, UserDTO dto, String rawPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        user.setFullname(dto.getFullname());
        user.setEmail(dto.getEmail());
        if (rawPassword != null && !rawPassword.isBlank())
            user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(dto.getRole());
        user.setTeam(dto.getTeam());
        user.setFactoryAgent(dto.getFactoryAgent());
        return toDto(userRepository.save(user));
    }

    public void delete(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        auditLogService.log("DELETE_USER", "Deleted user " + u.getUsername());
        userRepository.deleteById(id);
    }

    private UserDTO toDto(User u) {
        UserDTO d = new UserDTO();
        d.setId(u.getId()); d.setUsername(u.getUsername()); d.setFullname(u.getFullname());
        d.setEmail(u.getEmail()); d.setRole(u.getRole()); d.setTeam(u.getTeam());
        d.setFactoryAgent(u.getFactoryAgent()); d.setCreatedAt(u.getCreatedAt()); return d;
    }
}
