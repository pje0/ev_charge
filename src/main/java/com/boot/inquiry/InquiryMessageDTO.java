package com.boot.inquiry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryMessageDTO {
    private Long id;              // 메시지 고유 ID
    private Long roomId;          // 소속된 방 ID
    private Long senderId;        // 발신자 ID
    private String senderRole;    // 발신자 권한 (USER / ADMIN)
    private String message;       // 메시지 내용
    private String messageType;   // TEXT / IMAGE
    private String isRead;        // 읽음 여부 (N / Y)
    private LocalDateTime createdAt;
}