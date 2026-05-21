package com.boot.ev_charge.user;

import lombok.Getter;
import java.io.Serializable;

@Getter
public class SessionUser implements Serializable {
    private String loginId;
    private String role;

    public SessionUser(String loginId, String role) {
        this.loginId = loginId;
        this.role = role;
    }
}