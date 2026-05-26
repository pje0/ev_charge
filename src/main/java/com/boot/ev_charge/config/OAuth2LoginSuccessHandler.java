package com.boot.ev_charge.config;

import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private UserService userService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = token.getPrincipal();
        String registrationId = token.getAuthorizedClientRegistrationId();

        String name = null;
        String email = null;

        if ("google".equals(registrationId)) {
            name = oAuth2User.getAttribute("name");
            email = oAuth2User.getAttribute("email");

        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> kakaoAccount = oAuth2User.getAttribute("kakao_account");
            Map<String, Object> profile = kakaoAccount != null ? (Map<String, Object>) kakaoAccount.get("profile") : null;
            name = profile != null ? (String) profile.get("nickname") : null;
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");
            }
        } else if ("naver".equals(registrationId)) {
            Map<String, Object> naverAccount = oAuth2User.getAttribute("response");
            System.out.println("네이버 속성: " + oAuth2User.getAttributes());
            System.out.println("네이버 response: " + naverAccount);
            name = naverAccount != null ? (String) naverAccount.get("name") : null;
            email = naverAccount != null ? (String) naverAccount.get("email") : null;
        }
        
        System.out.println("최종 name: " + name);

     // DB에 없으면 자동 회원가입
        String loginId = registrationId + "_" + oAuth2User.getName();
        UserDto user = userService.findByLoginId(loginId);
        if (user == null) {
            // 이메일로 기존 유저 찾기
            if (email != null) {
                UserDto existingUser = userService.findByEmail(email);
                if (existingUser != null) {
                    // 이미 같은 이메일로 가입된 유저 → 그냥 로그인
                    response.sendRedirect("/");
                    return;
                }
            }
            UserDto newUser = new UserDto();
            newUser.setLoginId(loginId);
            newUser.setPassword("OAUTH2_USER");
            newUser.setName(name != null ? name : "소셜사용자");
            newUser.setEmail(email);
            newUser.setRole("USER");
            userService.signupOAuth2(newUser);
        }
        response.sendRedirect("/");
    }
}