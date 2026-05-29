package com.boot.ev_charge.mypage;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MyPageDto {
    // 1. 회원 기본 정보
    private int userId;
    private String username;
    private String password;
    private String name;
    private String email;
    private String phone;            // 🌟 추가: 010-1234-1234
    private LocalDateTime createdAt; // 🌟 가입일 (2026-05-20)
    private String currentPassword;
    private String role;

    // 2. 충전 통계 (UI 중간 영역용)
    private int totalChargeCount;    // 총 충전 횟수 (0회)
    private double totalChargeKw;    // 총 충전량 (0 kWh)
    private double savedCarbon;      // 절약한 탄소 (0.0 kg)

    // 3. 예약 마스터 및 상세 정보 (하단 목록 렌더링용)
    private Long reservationId;
    private Long chargerId;
    private String reservationType; 
    private String status;
    private Timestamp reservationCreatedAt;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") // 🟢 날짜 변환기 추가
    private Timestamp startTime;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") // 🟢 날짜 변환기 추가
    private Timestamp endTime;
    private Integer targetAmount;
    
    // 4. 충전소 및 충전기 정보
    private Long stationId;
    private String stationName;
    private String connectorType;   
    private Integer powerKw;      
    private Integer maxMinutes;
}