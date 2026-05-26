package com.boot.ev_charge.inquiry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class InquiryServiceImpl implements InquiryService {

    @Autowired
    private InquiryDAO inquiryDAO;

    /**
     * [사용자] 메시지 전송 로직
     * 논리: OPEN된 방 검색 -> 없으면 생성 -> 생성된(혹은 기존) ID로 메시지 저장
     */
    @Override
    @Transactional
    public void sendMessageFromUser(Long userId, String content) {
        InquiryRoomDTO room = inquiryDAO.findOpenRoomByUserId(userId);
        
        if (room == null) {
            room = InquiryRoomDTO.builder()
                    .userId(userId)
                    .status("OPEN")
                    .build();
            inquiryDAO.createRoom(room); 
        }

        InquiryMessageDTO message = InquiryMessageDTO.builder()
                .roomId(room.getId())
                .senderId(userId)
                .senderRole("USER")
                .message(content)
                .messageType("TEXT")
                .isRead("N")
                .build();
        
        inquiryDAO.insertMessage(message);
    }

    /**
     * [공통] 채팅 내역 조회
     * 논리: 실시간 폴링 시 중복 읽음 처리를 방지하기 위해 단순 조회만 수행
     */
    @Override
    public List<InquiryMessageDTO> getChatHistory(Long roomId) {
        // 이제 관리자가 조회해도 여기서 자동으로 읽음 처리를 하지 않습니다.
        return inquiryDAO.selectMessageList(roomId);
    }

    /**
     * [관리자] 읽음 처리 전용
     * 논리: 관리자가 방을 클릭하는 시점에 명시적으로 호출하여 읽음(is_read = 'Y') 처리 수행
     */
    @Override
    @Transactional
    public void markAsRead(Long roomId) {
        inquiryDAO.updateReadStatus(roomId);
    }

    /**
     * [관리자] 답변 전송 로직
     * 논리: 담당 관리자 지정(최초 1회) -> 답변 메시지 저장
     */
    @Override
    @Transactional
    public void replyFromAdmin(Long adminId, Long roomId, String content) {
        inquiryDAO.updateRoomAdmin(roomId, adminId);

        InquiryMessageDTO message = InquiryMessageDTO.builder()
                .roomId(roomId)
                .senderId(adminId)
                .senderRole("ADMIN")
                .message(content)
                .messageType("TEXT")
                .isRead("Y")
                .build();

        inquiryDAO.insertMessage(message);
    }

    /**
     * [관리자] 문의 종료 로직
     */
    @Override
    @Transactional
    public void closeInquiry(Long roomId) {
        inquiryDAO.closeRoom(roomId);
    }
}