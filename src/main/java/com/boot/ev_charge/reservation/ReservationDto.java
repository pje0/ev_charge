package com.boot.ev_charge.reservation;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class ReservationDto {

    private Long id;
    private Long userId;
    private Long chargerId;
    private Long stationId;

    private String reservationType;
    private String status;
    private String carType;
    private Timestamp reservedAt;

    private Timestamp actualStartTime;
    private Timestamp actualEndTime;

    // TIME 예약
    private Timestamp startTime;
    private Timestamp endTime;

    // TARGET 예약
    private Integer targetKwh;
    private Integer maxMinutes;
    
    // 예약 생성 시간 관리
    private Timestamp createdAt;
}