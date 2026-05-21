package com.boot.ev_charge.user;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class UserController {

    @GetMapping("/login")
    public String login() {
        return "user/login";
    }
    
    @GetMapping("/signup")
    public String signup() {
        return "user/signup";
    }
}