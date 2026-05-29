package com.boot.ev_charge.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 프론트엔드 header.jsp의 EventSource 요청과 연결을 맺는 실시간 구독 API
     * 
     * @param loginId 프론트엔드에서 encodeURIComponent 처리하여 보낸 로그인 아이디
     * @param authentication Spring Security의 인증 객체 (보안 검증용)
     * @return 실시간 데이터 스트림 통로인 SseEmitter 객체 반환
     */
    @GetMapping(value = "/subscribe/{loginId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable("loginId") String loginId, Authentication authentication) {
        
        // 1. 보안 검증: 현재 요청을 보낸 세션이 Spring Security에 인증된 상태인지 확인
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("인증되지 않은 사용자의 실시간 알림 구독 요청이 거부되었습니다.");
            return null;
        }

        // 2. URL 경로 변수로 들어온 로그인 ID 디코딩 안전 처리
        String decodedLoginId = URLDecoder.decode(loginId, StandardCharsets.UTF_8);
        
        // 3. 보안 크로스 체크: 주소창에 전달된 아이디와 실제 시큐리티 인증 세션의 주인이 일치하는지 검증
        String securityLoginId = authentication.getName();
        if (!decodedLoginId.equals(securityLoginId)) {
            log.warn("보안 경고: 요청된 아이디({})와 세션 인증 아이디({})가 불일치하여 구독을 거부합니다.", decodedLoginId, securityLoginId);
            return null;
        }

        log.info("실시간 알림 스트림 구독 승인 완료 ➔ 유저 계정: {}", decodedLoginId);

        // 4. 비즈니스 서비스로 책임을 위임하여 1시간 동안 유지되는 실시간 통로를 개통 및 반환
        return notificationService.createSseConnection(decodedLoginId);
    }
}