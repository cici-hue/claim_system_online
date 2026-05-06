package com.otto.cms.dto;

import com.otto.cms.entity.User;
import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String fullname;
    private String email;
    private User.Role role;
    private String team;
    private String factoryAgent;
    private java.time.LocalDateTime createdAt;
}
