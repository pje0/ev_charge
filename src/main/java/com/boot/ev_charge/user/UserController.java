package com.boot.ev_charge.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.http.HttpSession;

@Controller
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/login")
    public String loginForm() {
        return "user/login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String loginId,
                        @RequestParam String password,
                        HttpSession session,
                        Model model) {
        if (userService.login(loginId, password)) {
            session.setAttribute("loginUser", new SessionUser(loginId, userService.getRole(loginId)));
            return "redirect:/";
        }
        model.addAttribute("error", "아이디 또는 비밀번호가 올바르지 않습니다.");
        return "user/login";
    }

    @GetMapping("/signup")
    public String signupForm() {
        return "user/signup";
    }

    @PostMapping("/signup")
    public String signup(@RequestParam String loginId,
                         @RequestParam String password,
                         @RequestParam String name,
                         @RequestParam(required = false) String email,
                         Model model) {
        userService.signup(loginId, password, name, email);
        model.addAttribute("message", "회원가입이 완료되었습니다. 로그인해주세요.");
        return "user/login";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }
}