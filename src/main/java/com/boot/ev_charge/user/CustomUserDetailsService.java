package com.boot.ev_charge.user;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserService userService;

    @Override
    public UserDetails loadUserByUsername(String loginId)
            throws UsernameNotFoundException {

        UserDto user = userService.findByLoginId(loginId);

        if (user == null) {
            throw new UsernameNotFoundException("사용자 없음");
        }

        return new User(
                user.getLoginId(),
                user.getPassword(),
                List.of(
                    new SimpleGrantedAuthority(
                            "ROLE_" + user.getRole()
                    )
                )
        );
    }
}