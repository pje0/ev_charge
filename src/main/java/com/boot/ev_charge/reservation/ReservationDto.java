package com.boot.ev_charge.reservation;

import java.sql.Timestamp;

import lombok.Data;

@Data
public class ReservationDto {

    private Long id;        // 예약 고유 ID (PK)
    private Long userId;    // 예약한 회원 ID (user 테이블 FK)
    private Long chargerId; // 예약한 충전기 ID (charger 테이블 FK)
    private Long stationId; // 충전소 ID (station 테이블 FK 또는 조회용)

    private String reservationType;     // 예약 유형 (시간 예약 TIME, 목표 충전량 예약 TARGET)
    private String status;              // 예약 상태
										// RESERVED  : 예약 완료
										// CHARGING  : 충전 진행 중
										// COMPLETED : 충전 완료
										// CANCELED  : 예약 취소
										// EXPIRED   : 예약 시간 만료
    
    private String carType;             // 차량 종류
    private Timestamp reservedAt;       // 예약 확정 시간

    private Timestamp actualStartTime;  // 실제 충전 시작 시간
    private Timestamp actualEndTime;    // 실제 충전 종료 시간

    // TIME 예약
    private Timestamp startTime; // 예약 시작 시간
    private Timestamp endTime;   // 예약 종료 시간

    // TARGET 예약
    private Integer targetKwh;   // 목표 충전량(kWh)
    private Integer targetPercent; // 추가: 프론트엔드 % 값 수신 전용 필드
    private Integer maxMinutes;  // 최대 충전 가능 시간(분)
    
    // 예약 생성 시간 관리
    private Timestamp createdAt; // 예약 생성 일시
}