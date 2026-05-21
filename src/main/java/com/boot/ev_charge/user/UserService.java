package com.boot.ev_charge.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    // 로그인 - 아이디/비밀번호 확인 후 UserDto 반환
    public UserDto login(String loginId, String password) {
        UserDto user = userMapper.findByLoginId(loginId);
        if (user != null && user.getPassword().equals(password)) {
            return user;
        }
        return null;
    }

    // 회원가입
    public boolean signup(UserDto user) {
        // 아이디 중복 체크
        if (userMapper.countByLoginId(user.getLoginId()) > 0) {
            return false;
        }
        // 이메일 중복 체크 (이메일 있을 때만)
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            if (userMapper.countByEmail(user.getEmail()) > 0) {
                return false;
            }
        }
        userMapper.insert(user);
        return true;
    }
}