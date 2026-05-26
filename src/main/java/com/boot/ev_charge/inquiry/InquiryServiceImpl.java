package com.boot.inquiry;

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
    @Transactional // 방 생성과 메시지 저장이 동시에 성공해야 함
    public void sendMessageFromUser(Long userId, String content) {
        // 1. 해당 유저의 활성화된(OPEN) 방이 있는지 확인
        InquiryRoomDTO room = inquiryDAO.findOpenRoomByUserId(userId);
        
        // 2. 방이 없다면 새로 생성
        if (room == null) {
            room = InquiryRoomDTO.builder()
                    .userId(userId)
                    .status("OPEN")
                    .build();
            // MyBatis의 useGeneratedKeys로 인해 room 객체에 id가 자동으로 채워짐
            inquiryDAO.createRoom(room); 
        }

        // 3. 메시지 객체 생성 및 저장
        InquiryMessageDTO message = InquiryMessageDTO.builder()
                .roomId(room.getId())
                .senderId(userId)
                .senderRole("USER")
                .message(content)
                .messageType("TEXT")
                .isRead("N") // 유저가 보낸 것은 관리자가 읽어야 하므로 N
                .build();
        
        inquiryDAO.insertMessage(message);
    }

    /**
     * [공통] 채팅 내역 조회
     * 논리: 관리자(ADMIN)가 조회하는 경우에만 읽음(is_read = 'Y') 처리 수행
     */
    @Override
    @Transactional
    public List<InquiryMessageDTO> getChatHistory(Long roomId, String userRole) {
        if ("ADMIN".equals(userRole)) {
            inquiryDAO.updateReadStatus(roomId);
        }
        return inquiryDAO.selectMessageList(roomId);
    }

    /**
     * [관리자] 답변 전송 로직
     * 논리: 담당 관리자 지정(최초 1회) -> 답변 메시지 저장
     */
    @Override
    @Transactional
    public void replyFromAdmin(Long adminId, Long roomId, String content) {
        // 1. 해당 방에 관리자가 배정되지 않았다면 현재 관리자로 배정
        inquiryDAO.updateRoomAdmin(roomId, adminId);

        // 2. 관리자 답변 메시지 저장
        InquiryMessageDTO message = InquiryMessageDTO.builder()
                .roomId(roomId)
                .senderId(adminId)
                .senderRole("ADMIN")
                .message(content)
                .messageType("TEXT")
                .isRead("Y") // 관리자가 쓴 글은 이미 확인된 상태이므로 Y
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