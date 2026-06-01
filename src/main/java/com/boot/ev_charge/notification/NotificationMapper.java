package com.boot.ev_charge.notification;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface NotificationMapper {
    // 1. 신규 알림 데이터 DB 적재
    int insertNotification(NotificationDTO dto);

    // 2. 안 읽은 알림 목록 조회 (개수 검증용)
    List<NotificationDTO> selectUnreadListByUserId(@Param("userId") Long userId);

    // 3. 전체 알림 목록 최신순 조회 (알림센터 목록용)
    List<NotificationDTO> selectAllListByUserId(@Param("userId") Long userId);

    // 4. 단일 알림 읽음 처리 (N -> Y)
    int updateNotificationReadStatus(@Param("id") Long id);

    // 5. 전체 알림 일괄 읽음 처리 (N -> Y)
    int updateAllNotificationReadStatus(@Param("userId") Long userId);

    // =========================================================================
    // 🚨 [신설] 3대 알림 라이프사이클(클릭 즉시 파기 및 전 자동 교체) 전용 삭제 메서드
    // =========================================================================

    // [시점 1, 4 & 공통 해결]: 유저가 알림창에서 카드 클릭 시, DB에서 아예 행을 공중분해(완전 파기)하는 메서드
    int deleteNotificationById(@Param("id") Long id);

    // [시점 2 해결]: 예약이 실제 충전 중(CHARGING)으로 넘어갈 때, 남아있던 '15분 전 입고 알림'만 저격해서 완전히 지우는 메서드
    int deleteBeforeNoticeByResId(@Param("referenceId") Long referenceId);

    // [시점 3 해결]: 충전이 완료(COMPLETED)로 마감될 때, 화면에 켜져 있던 '충전 진행 중 알림'만 저격해서 완전히 지우는 메서드
    int deleteStartNoticeByResId(@Param("referenceId") Long referenceId);
}