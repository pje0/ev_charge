package com.boot.ev_charge.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private Long id;                // 알림 고유 ID (PK)
    private Long userId;            // 수신 회원 고유 ID (FK)
    private String type;            // 알림 유형 (CHARGE_COMPLETE 등)
    private String title;           // 알림 제목
    private String content;         // 알림 내용
    @Builder.Default
    private String isRead = "N";    // 읽음 여부 (Y/N)
    private Long referenceId;       // 관련 데이터 ID (예약 ID 등)
    private String referenceType;   // 관련 데이터 타입 (RESERVATION 등)
    private LocalDateTime createdAt; // 발생 일시
}