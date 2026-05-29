package com.boot.ev_charge.notification;

import com.boot.ev_charge.user.UserService;
import com.boot.ev_charge.user.UserDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;
    private final UserService userService; // ⭕ 완성된 로그인 인프라와 연동하기 위해 UserService 주입!

    /**
     * 1. [실시간 구독] header.jsp의 EventSource와 독점 데이터 스트림 연결을 맺는 API
     */
    @GetMapping(value = "/subscribe/{loginId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable("loginId") String loginId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("인증되지 않은 사용자의 실시간 알림 구독 요청이 거부되었습니다.");
            return null;
        }

        String decodedLoginId = URLDecoder.decode(loginId, StandardCharsets.UTF_8);
        String securityLoginId = authentication.getName(); // 시큐리티 세션의 loginId 추출
        
        if (!decodedLoginId.equals(securityLoginId)) {
            log.warn("보안 경고: 요청 아이디({})와 세션 아이디({})가 불일치하여 구독을 거부합니다.", decodedLoginId, securityLoginId);
            return null;
        }

        log.info("실시간 알림 스트림 개통 완료 ➔ 계정: {}", decodedLoginId);
        return notificationService.createSseConnection(decodedLoginId);
    }

    /**
     * 2. [목록 조회] 사용자가 알림센터를 열었을 때 로그인한 유저의 내역을 최신순으로 반환
     */
    @GetMapping("/list")
    public List<NotificationDTO> getNotificationList(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        // 1. 시큐리티 세션에 박혀있는 로그인 아이디(admin, hong 등)를 안전하게 획득합니다.
        String loginId = authentication.getName();
        
        // 2. [강제주입 박멸] UserService를 가동하여 DB유저 테이블의 진짜 고유 식별 번호(PK)를 획득합니다.
        UserDto user = userService.findByLoginId(loginId);
        if (user == null) return null;
        
        Long userId = user.getId(); // ➔ 유저 테이블의 진짜 고유 숫자 고정 연동 성공! (1, 2, 3, 4 등)
        
        log.info("알림 보관함 리스트 조회 완료 ➔ 로그인 유저 계정: {}", loginId);
        return notificationMapper.selectAllListByUserId(userId);
    }

    /**
     * 3. [개수 검증] 최초 페이지 로드 시 상단 종 🔔 아이콘 위에 빨간 점을 표시할지 결정
     */
    @GetMapping("/unread-count")
    public int getUnreadCount(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return 0;
        }
        
        String loginId = authentication.getName();
        UserDto user = userService.findByLoginId(loginId); // ⚠️ 프로젝트 내 명세 메서드명(findByLoginId)과 매핑하세요.
        if (user == null) return 0;
        
        List<NotificationDTO> unreadList = notificationMapper.selectUnreadListByUserId(user.getId());
        return unreadList != null ? unreadList.size() : 0;
    }

    /**
     * 4. [일괄 읽음] 사용자가 보관함을 열어 목록을 확인했으므로 빨간 배지를 끄고 일괄 'Y' 마감
     */
    @PostMapping("/read-all")
    public boolean readAllNotifications(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        
        String loginId = authentication.getName();
        UserDto user = userService.findByLoginId(loginId);
        if (user == null) return false;
        
        log.info("알림센터 전체 확인 완료 ➔ 유저 계정: {}", loginId);
        return notificationMapper.updateAllNotificationReadStatus(user.getId()) > 0;
    }

    /**
     * 5. [개별 알림 읽음] 사용자가 특정 알림 카드를 클릭했을 때 해당 건만 콕 집어서 'Y' 처리
     */
    @PostMapping("/read/{id}")
    public boolean readNotification(@PathVariable("id") Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        log.info("단일 알림 카드 클릭 읽음 처리 ➔ 알림 식별 번호(PK): {}", id);
        return notificationMapper.updateNotificationReadStatus(id) > 0;
    }
}