package com.boot.ev_charge.user;

import org.springframework.stereotype.Service;

@Service
public class UserService {
    // TODO: DB 연결 후 UserMapper 주입해서 구현
    
    public boolean login(String loginId, String password) {
        // 임시 데모 계정
        if ("admin".equals(loginId) && "1234".equals(password)) return true;
        if ("user".equals(loginId) && "1234".equals(password)) return true;
        return false;
    }
    
    public String getRole(String loginId) {
        if ("admin".equals(loginId)) return "ADMIN";
        return "USER";
    }
    
    public boolean signup(String loginId, String password, String name, String email) {
        // TODO: DB INSERT 구현
        return true;
    }
}