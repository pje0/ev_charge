package com.boot.inquiry;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface InquiryDAO {

    // --- 사용자(User) 관련 ---
    
    // 1. 유저의 활성화된(OPEN) 방이 있는지 확인
    InquiryRoomDTO findOpenRoomByUserId(Long userId);

    // 2. 새 문의방 생성 (첫 문의 시)
    int createRoom(InquiryRoomDTO room);

    // 3. 메시지 발송 (유저/관리자 공통)
    int insertMessage(InquiryMessageDTO message);


    // --- 관리자(Admin) 관련 ---

    // 4. 관리자 대시보드용 전체 티켓 목록 조회
    // (서브쿼리를 통해 lastMessage, unreadCount를 함께 가져옴)
    List<InquiryRoomDTO> selectAllRoomList();

    // 5. 관리자가 답변 시 담당자(admin_id) 배정
    int updateRoomAdmin(@Param("roomId") Long roomId, @Param("adminId") Long adminId);

    // 6. 문의 종료 (OPEN -> CLOSED)
    int closeRoom(Long roomId);


    // --- 공통 ---

    // 7. 채팅방 내역 불러오기
    List<InquiryMessageDTO> selectMessageList(Long roomId);

    // 8. 읽음 처리 (관리자가 방 입장 시 실행)
    int updateReadStatus(Long roomId);
}