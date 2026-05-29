package com.boot.ev_charge.notification;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface NotificationMapper {

    /**
     * 1. 신규 알림 데이터 적재 (실시간 푸시 트리거 전 필수 실행)
     */
    int insertNotification(NotificationDTO dto);

    /**
     * 2. 특정 회원의 안 읽은 알림 목록만 필터링 조회 (최신순 정렬)
     */
    List<NotificationDTO> selectUnreadListByUserId(@Param("userId") Long userId);

    /**
     * 3. 특정 회원의 전체 알림 히스토리 내역 목록 조회 (최신순 정렬)
     */
    List<NotificationDTO> selectAllListByUserId(@Param("userId") Long userId);

    /**
     * 4. 단일 알림 읽음 표시 전환 (N -> Y)
     */
    int updateNotificationReadStatus(@Param("id") Long id);

    /**
     * 5. 특정 회원의 모든 안 읽은 알림 일괄 읽음 처리 완료 (🔔 클릭 시 일괄 삭제/읽음용)
     */
    int updateAllNotificationReadStatus(@Param("userId") Long userId);
}