package com.boot.ev_charge.adminpage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminReplyDTO {
    private Long roomId;       // inquiry_room 테이블의 ID
    private Long senderId;     // 답변을 작성하는 관리자의 user.id
    private String message;    // 관리자가 입력한 답변 내용
    private String senderRole; // "ADMIN"으로 고정하여 DB에 저장
    private String createdAt;  // 화면에 즉시 뿌려주기 위한 전송 시간 (선택 사항)
}