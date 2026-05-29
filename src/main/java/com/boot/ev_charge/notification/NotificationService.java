package com.boot.ev_charge.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;

    // 현재 웹앱에 로그인해서 돌아다니고 있는 세션 회원들의 실시간 SSE 소켓 객체 보관 저장소 (메모리 락 방지용 동시성 맵)
    // Key: Spring Security의 principal.username (로그인 아이디)
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    // 실시간 연결 파이프라인 최대 유효 시간 설정 (1시간)
    private static final Long CONNECTION_TIMEOUT = 60 * 60 * 1000L;

    /**
     * 1. [프론트 연동] 로그인 사용자의 독점 실시간 알림 수신용 파이프라인(SSE) 개설
     * @param loginId Spring Security 인증 객체에서 추출한 유저 로그인 아이디
     */
    public SseEmitter createSseConnection(String loginId) {
        // 지정된 타임아웃을 가진 Emitter 객체 생성
        SseEmitter emitter = new SseEmitter(CONNECTION_TIMEOUT);
        emitters.put(loginId, emitter);

        // 네트워크 유실, 타임아웃 만료, 시스템 예외 발생 시 안전하게 메모리 자원 반납 처리 프로세스 기동
        emitter.onCompletion(() -> emitters.remove(loginId));
        emitter.onTimeout(() -> emitters.remove(loginId));
        emitter.onError((e) -> emitters.remove(loginId));

        // [중요] 최초 스트림 구독 시 더미 데이터를 즉시 한번 발송해 주어야 503 만료 에러(HTTP 503 Service Unavailable)를 완벽하게 방어할 수 있습니다.
        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .id("CONNECTED_SIGNAL")
                    .data("EV 충전소 실시간 통신 스트림 개통 성공"));
        } catch (IOException e) {
            log.error("실시간 SSE 파이프라인 최초 수립 신호 전달 실패, 유저 아이디: {}", loginId, e);
            emitters.remove(loginId);
        }

        return emitter;
    }

    /**
     * 2. [비즈니스 연동 허브] 특정 행위(충전완료, 예약성공 등)가 터졌을 때 DB 적재 및 화면 실시간 토스트 강제 팝업 트리거
     * @param targetLoginId 알림을 수신해야 할 대상 회원의 로그인 아이디
     * @param dto 알림 정보 페이로드 객체
     */
    public void sendRealtimeNotice(String targetLoginId, NotificationDTO dto) {
        // [단계 1] 이력 증적을 보존하기 위해 MyBatis 매퍼를 이용하여 DB 테이블에 영속화 인서트 실행
        int savedResult = notificationMapper.insertNotification(dto);
        
        if (savedResult <= 0) {
            log.error("알림 데이터베이스 백업 적재 실패 - 대상 유저 식별값: {}", dto.getUserId());
            return;
        }

        // [단계 2] 현재 브라우저를 켜고 로그인된 상태(온라인 상태)인지 맵에서 스캔 확인
        if (emitters.containsKey(targetLoginId)) {
            SseEmitter targetUserEmitter = emitters.get(targetLoginId);
            try {
                // 프론트 header.jsp 하단의 eventSource.addEventListener("alarm", ...) 단으로 데이터 스트림 다이렉트 발사 🚀
                targetUserEmitter.send(SseEmitter.event()
                        .name("alarm") // 프론트의 리스너 이벤트 이름과 정확하게 일치해야 합니다.
                        .id(String.valueOf(dto.getId()))
                        .data(dto)); // DTO 객체가 Jackson 라이브러리에 의해 자동으로 깔끔한 JSON 문법으로 직렬화되어 날아갑니다.
                        
                log.info("실시간 토스트 푸시 알림 전송 완료 ➔ 수신자: {}", targetLoginId);
            } catch (IOException e) {
                log.warn("사용자 웹브라우저 스트림이 비정상적으로 종료되었습니다. 자원 조기 회수 처리 ➔ 유저: {}", targetLoginId);
                emitters.remove(targetLoginId);
            }
        } else {
            // 오프라인 상태일 경우 DB에만 안전하게 적재되었으므로, 추후 사용자가 로그인하여 마이페이지 진입 시 목록으로 로드됩니다.
            log.info("알림 수신 대상자가 오프라인 상태입니다. DB 적재 마감 완료 ➔ 유저: {}", targetLoginId);
        }
    }
}