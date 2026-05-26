package com.boot.inquiry;

import java.util.List;

public interface InquiryService {

    /**
     * [사용자] 메시지 전송
     * 방이 없으면 생성하고, 있으면 기존 방에 메시지를 저장합니다.
     */
    void sendMessageFromUser(Long userId, String content);

    /**
     * [공통] 채팅 내역 조회
     * 관리자가 조회할 경우 자동으로 '읽음' 처리가 수행됩니다.
     */
    List<InquiryMessageDTO> getChatHistory(Long roomId, String userRole);

    /**
     * [관리자] 답변 전송
     * 답변 저장과 동시에 담당 관리자를 배정합니다.
     */
    void replyFromAdmin(Long adminId, Long roomId, String content);

    /**
     * [관리자] 문의 종료
     * 상담이 완료된 티켓을 CLOSED 상태로 변경합니다.
     */
    void closeInquiry(Long roomId);
}