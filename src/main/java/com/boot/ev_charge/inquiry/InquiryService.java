package com.boot.ev_charge.inquiry;

import com.boot.ev_charge.notification.NotificationDTO;
import com.boot.ev_charge.notification.NotificationService; // 추가: 실시간 알림 서비스 임포트
import com.boot.ev_charge.user.UserService;
import com.boot.ev_charge.user.UserDto; // 추가: 유저 정보 추적을 위한 임포트
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class InquiryService  {

    @Autowired
    private InquiryMapper inquiryMapper;

    @Autowired
    private NotificationService notificationService; // 추가: 실시간 알림 서비스 결합

    @Autowired
    private UserService userService; // 추가: 문의 작성 유저의 로그인 ID(문자열) 추적을 위해 결합

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
     * [관리자] 답변 전송 로직 (실시간 알림센터 연동 고도화 🌟)
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

        // ====================================================================
        // 🚨 [신설] 1:1 문의 답변 실시간 푸시 및 알림센터 보관함 적재 로직 가동
        // ====================================================================
        try {
            // 1. 신설된 9번 쿼리를 호출하여 방의 식별 ID와 문의 유저의 정보(userId, loginId)를 동시 가로챕니다.
            InquiryRoomDTO currentRoom = inquiryMapper.findRoomById(roomId); 
            
            if (currentRoom != null) {
                Long targetUserId = currentRoom.getUserId(); // 수신 회원의 숫자 고유 식별 번호 (PK)
                
                // ⭕ [에러 해결]: 복잡한 userService 구문을 완전히 제거하고, 
                // xml 조인(JOIN) 쿼리로 깔끔하게 긁어온 currentRoom 내부의 loginId를 바로 대입합니다!
                String targetUserLoginId = currentRoom.getLoginId(); 
                
                // 로그인 ID 정보가 무결하게 존재할 때만 실시간 알림 가동
                if (targetUserLoginId != null && !targetUserLoginId.trim().isEmpty()) {
                    
                    // 알림 데이터베이스 규격에 맞춰 객체 최종 패키징
                    NotificationDTO replyAlarm = NotificationDTO.builder()
                            .userId(targetUserId)         // 수신 회원 고유 ID (FK)
                            .type("INQUIRY_REPLIED")      // 1:1 문의 답변 알림 카테고리 분류 코드
                            .title("💬 1:1 문의 답변 등록")  // 알림센터 목록 상단 타이틀
                            .content("제출하신 문의 사항에 대해 관리자의 답변이 등록되었습니다.") // 본문 세부 내용
                            .referenceId(roomId)          // 사용자가 클릭 시 바로 유입되어 연결될 문의방 번호
                            .referenceType("INQUIRY")     // 헤더 자바스크립트의 분기 판단용 타입 태그 명시
                            .isRead("N")
                            .build();

                    // 완성해 둔 알림 비동기 서비스 허브를 강제 기동하여 실시간 푸시 발사! 🚀
                    notificationService.sendRealtimeNotice(targetUserLoginId, replyAlarm);
                }
            }
        } catch (Exception e) {
            System.err.println("실시간 문의 알림 처리 중 예외 발생 (본문 대화는 전송 완료): " + e.getMessage());
        }
    }

    /**
     * [관리자] 문의 종료 로직 (기존 유지)
     */
    @Transactional
    public void closeInquiry(Long roomId) {
        inquiryMapper.closeRoom(roomId);
    }
}