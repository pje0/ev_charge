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
}