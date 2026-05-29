package com.boot.ev_charge.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * [Notification 도메인] 알림 데이터 전송 및 교환을 전담하는 객체 (DTO)
 * DB 테이블 필드 규격 및 프론트엔드 JSON 수신 페이로드 규격과 1:1 대응합니다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private Long id;                // 알림 고유 식별키 (PK, AUTO_INCREMENT)
    private Long userId;            // 알림을 수신할 회원 고유 ID (FK)
    private String type;            // 알림 유형 분류 코드 (ex: CHARGE_COMPLETE, CHARGE_ERROR, RESERVATION)
    private String title;           // 프론트 토스트창 상단에 표시될 알림 제목
    private String content;         // 알림 본문 상세 세부 정보 내용
    
    @Builder.Default
    private String isRead = "N";    // 읽음 상태 여부 (Y: 읽음, N: 안읽음 / 기본값 'N')
    
    private Long referenceId;       // 연계 데이터 고유 ID (ex: 예약 취소/완료 시 해당 reservation_id 적재)
    private String referenceType;   // 연계 데이터 테이블 타입 분류 (ex: "RESERVED", "STATION")
    
    private LocalDateTime createdAt; // 알림 발생 일시 (DEFAULT: CURRENT_TIMESTAMP)
}