package com.boot.ev_charge.user;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/login")
    public String loginForm() {
        return "user/login";
    }

    @PostMapping("/login")
    public String login(@RequestParam("loginId") String loginId,
                        @RequestParam("password") String password,
                        HttpSession session,
                        Model model) {
        UserDto user = userService.login(loginId, password);
        if (user != null) {
            session.setAttribute("loginUser", new SessionUser(user.getId(), user.getLoginId(), user.getName(), user.getEmail(), user.getRole()));
            return "redirect:/";
        }
        model.addAttribute("error", "아이디 또는 비밀번호가 올바르지 않습니다.");
        return "user/login";
    }

    @GetMapping("/signup")
    public String signupForm() {
        return "user/login";
    }

    @PostMapping("/signup")
    public String signup(@RequestParam("loginId") String loginId,
			            @RequestParam("password") String password,
			            @RequestParam("name") String name,
			            @RequestParam(value = "email", required = false) String email,
			            @RequestParam(value = "phone", required = false) String phone,
                         Model model) {
        UserDto user = new UserDto();
        user.setLoginId(loginId);
        user.setPassword(password);
        user.setName(name);
        user.setEmail(email);
        user.setPhone(phone);

        boolean result = userService.signup(user);
        if (result) {
            model.addAttribute("message", "회원가입이 완료되었습니다. 로그인해주세요.");
        } else {
            model.addAttribute("error", "이미 사용 중인 아이디 또는 이메일입니다.");
        }
        return "user/login";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }
}