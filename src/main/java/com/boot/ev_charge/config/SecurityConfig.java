package com.boot.ev_charge.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Lazy
    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    
    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
            	    .requestMatchers(
//            	    	비로그인도 접근 가능한 경로
            	        "/", "/login", "/signup", "/login-process",
            	        "/css/**", "/js/**", "/images/**",
            	        "/map", "/calculator",
            	        "/api/**",
            	        "/WEB-INF/**"  
            	    ).permitAll()
            	    .requestMatchers("/admin/**").hasRole("ADMIN")
            	    .anyRequest().authenticated()
            	)
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login-process")
                .usernameParameter("loginId")
                .passwordParameter("password")
                .defaultSuccessUrl("/", true)
                .failureUrl("/login?error=true")
                .permitAll()
            )
            .oauth2Login(oauth2 -> oauth2
            	    .loginPage("/login")
            	    .userInfoEndpoint(userInfo -> userInfo
            	        .userService(customOAuth2UserService)
            	    )
            	    .successHandler(oAuth2LoginSuccessHandler)
            	)
            .logout(logout -> logout
            	    .logoutUrl("/logout")
            	    .logoutSuccessUrl("/")
            	    .invalidateHttpSession(true)
            	    .deleteCookies("JSESSIONID")
            	    .permitAll()
            	);

        return http.build();
    }
}