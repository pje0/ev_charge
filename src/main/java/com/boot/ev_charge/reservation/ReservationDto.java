package com.boot.ev_charge.reservation;

import java.sql.Timestamp;

import lombok.Data;

@Data
public class ReservationDto {

    private Long id;

    private Long userId;
    private Long chargerId;

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
}