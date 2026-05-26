package com.boot.ev_charge.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    public UserDto findByLoginId(String loginId) {
        return userMapper.findByLoginId(loginId);
    }
    
    public UserDto findByEmail(String email) {
        return userMapper.findByEmail(email);
    }
    
//  소셜 로그인용
    public void signupOAuth2(UserDto user) {
        userMapper.insert(user);
    }
    
    public int countByEmail(String email) {
        return userMapper.countByEmail(email);
    }

    // 회원가입
    public boolean signup(UserDto user) {

        if (userMapper.countByLoginId(user.getLoginId()) > 0) {
            return false;
        }

        if (user.getEmail() != null &&
            !user.getEmail().isEmpty()) {

            if (userMapper.countByEmail(user.getEmail()) > 0) {
                return false;
            }
        }

        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        userMapper.insert(user);

        return true;
    }
}