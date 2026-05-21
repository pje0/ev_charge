package com.boot.ev_charge.user;

import lombok.Getter;
import java.io.Serializable;

@Getter
public class SessionUser implements Serializable {
    private Long id;
    private String loginId;
    private String name;
    private String email;
    private String role;

    public SessionUser(Long id, String loginId, String name, String email, String role) {
        this.id = id;
        this.loginId = loginId;
        this.name = name;
        this.email = email;
        this.role = role;
    }
}