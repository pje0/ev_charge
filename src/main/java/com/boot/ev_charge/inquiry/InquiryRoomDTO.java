package com.boot.ev_charge.inquiry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryRoomDTO {
    private Long id;              // 방 고유 ID
    private Long userId;          // 문의자 ID
    private Long adminId;         // 담당 관리자 ID (배정 전 null)
    private String status;        // OPEN / CLOSED
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // --- Join 및 목록 출력용 확장 필드 ---
    private String userName;      // 문의자 이름 (user 테이블 join)
    private String lastMessage;   // 목록에 표시할 마지막 메시지
    private int unreadCount;      // 관리자가 읽지 않은 메시지 수
}