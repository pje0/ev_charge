package com.boot.ev_charge.dashboard;

import lombok.Data;

@Data
public class DashboardDTO {

    // 전체 회원 수
    private int userCount;
    // 오늘 생성된 예약 수
    private int todayReservationCount;
    // 현재 충전중(CHARGING)
    private int chargingCount;
    // 예약 대기(RESERVED)
    private int reservedCount;
    // 관리자 미확인 문의
    private int unreadInquiryCount;
    // 전체 공지 개수
    private int noticeCount;
}