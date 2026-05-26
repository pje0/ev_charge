package com.boot.ev_charge.inquiry;

import java.util.List;

public interface InquiryService {
	 // [추가] 사용자의 활성 방을 가져오거나, 없으면 새로 생성해서 반환
    InquiryRoomDTO getOrCreateRoom(Long userId);

     //[사용자] 메시지 전송
     //방이 없으면 생성하고, 있으면 기존 방에 메시지를 저장합니다.
    void sendMessageFromUser(Long userId, String content);

     //[공통] 채팅 내역 조회
     //단순 조회를 수행하며, 실시간 폴링 시 데이터 갱신 용도로 사용합니다.
    List<InquiryMessageDTO> getChatHistory(Long roomId);

     //[관리자] 읽음 처리 전용
     //관리자가 방을 클릭했을 때 명시적으로 호출하여 유저의 메시지를 '읽음' 처리합니다.
    void markAsRead(Long roomId);
   
     //[관리자] 답변 전송
     //답변 저장과 동시에 담당 관리자를 배정합니다.
    void replyFromAdmin(Long adminId, Long roomId, String content);

     //[관리자] 문의 종료
     //상담이 완료된 티켓을 CLOSED 상태로 변경합니다.
    void closeInquiry(Long roomId);
}