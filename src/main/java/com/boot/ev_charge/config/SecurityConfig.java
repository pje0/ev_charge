package com.boot.ev_charge.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
            	    .requestMatchers(
//            	    		비로그인도 접근 가능한 경로
            	        "/", "/login", "/signup", "/login-process",
            	        "/css/**", "/js/**", "/images/**",
            	        "/map", "/calculator",
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