package com.boot.ev_charge.inquiry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class InquiryService  {

    @Autowired
    private InquiryMapper inquiryMapper;

    /**
     * [추가] 방 확보 로직 (컨트롤러와 전송 로직에서 공통 사용)
     * 논리: OPEN된 방 검색 -> 없으면 생성하여 반환
     */
    @Transactional
    public InquiryRoomDTO getOrCreateRoom(Long userId) {
        InquiryRoomDTO room = inquiryMapper.findOpenRoomByUserId(userId);
        if (room == null) {
            room = InquiryRoomDTO.builder()
                    .userId(userId)
                    .status("OPEN")
                    .build();
            inquiryMapper.createRoom(room); // XML의 useGeneratedKeys로 id 채워짐
            // 생성된 ID를 확실히 포함하기 위해 재조회
            room = inquiryMapper.findOpenRoomByUserId(userId);
        }
        return room;
    }

    /**
     * [사용자] 메시지 전송 로직 (기존 로직 유지)
     */
    @Transactional
    public void sendMessageFromUser(Long userId, String content) {
        // 기존의 직접 조회/생성 로직 대신 공통 메서드 호출로 보완
        InquiryRoomDTO room = getOrCreateRoom(userId);

        InquiryMessageDTO message = InquiryMessageDTO.builder()
                .roomId(room.getId())
                .senderId(userId)
                .senderRole("USER")
                .message(content)
                .messageType("TEXT")
                .isRead("N")
                .build();
        
        inquiryMapper.insertMessage(message);
    }

    /**
     * [공통] 채팅 내역 조회 (기존 유지)
     */
    public List<InquiryMessageDTO> getChatHistory(Long roomId) {
        return inquiryMapper.selectMessageList(roomId);
    }

    /**
     * [관리자] 읽음 처리 전용 (기존 유지)
     */
    @Transactional
    public void markAsRead(Long roomId) {
        inquiryMapper.updateReadStatus(roomId);
    }

    /**
     * [관리자] 답변 전송 로직 (기존 유지)
     */
    @Transactional
    public void replyFromAdmin(Long adminId, Long roomId, String content) {
        inquiryMapper.updateRoomAdmin(roomId, adminId);

        InquiryMessageDTO message = InquiryMessageDTO.builder()
                .roomId(roomId)
                .senderId(adminId)
                .senderRole("ADMIN")
                .message(content)
                .messageType("TEXT")
                .isRead("Y")
                .build();

        inquiryMapper.insertMessage(message);
    }

    /**
     * [관리자] 문의 종료 로직 (기존 유지)
     */
    @Transactional
    public void closeInquiry(Long roomId) {
        inquiryMapper.closeRoom(roomId);
    }
}