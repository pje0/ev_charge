package com.boot.ev_charge.config;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        String name = null;

        if ("google".equals(registrationId)) {
            name = oAuth2User.getAttribute("name");

        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> kakaoAccount = oAuth2User.getAttribute("kakao_account");
            Map<String, Object> profile = kakaoAccount != null ? (Map<String, Object>) kakaoAccount.get("profile") : null;
            name = profile != null ? (String) profile.get("nickname") : null;

        } else if ("naver".equals(registrationId)) {
            Map<String, Object> response = oAuth2User.getAttribute("response");
            name = response != null ? (String) response.get("name") : null;
        }

        return new CustomOAuth2User(oAuth2User, name != null ? name : "사용자");
    }
    
    
}