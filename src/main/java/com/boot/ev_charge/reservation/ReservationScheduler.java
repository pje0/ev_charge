package com.boot.ev_charge.reservation;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * [RESERVATION SYSTEM] 예약 및 충전 상태 자동 관리 백그라운드 배치 사령탑
 * 규칙: 30분 단위 예약 시스템 스펙에 맞추어 5분 주기로 정밀 기동하며 장부 정리 및 알림 라이프사이클을 집행합니다.
 */
@Component
@Slf4j 
public class ReservationScheduler {

    @Autowired
    private ReservationService reservationService; // 비즈니스 로직 및 알림 허브 집행을 위한 의존성 주입

    /**
     * [최종 통합] 5분 주기 예약/충전 자동화 파이프라인 배치 프로세스 (매 5분 0초 가동)
     * 시나리오: 5분마다 깨어나서 [충전 시작/완료 상태 스위칭 및 알림 정화] ➔ [15분전 입고 안내] 순차 집행
     */
    @Scheduled(cron = "0 */5 * * * *")
    public void executeReservationBatchProcess() {
        log.info("[⏰ BATCH] 5분 주기 예약 시스템 통합 관리 자동화 배치 프로세스 가동 시작");
        
        // 파트 1: 충전 시작 시간 도래 건 상태 변경 및 종료 시간 만료 건 알림 세대교체 청소 집행
        try {
            log.info("[▶ BATCH-STEP 1] 충전 시작/종료 만료 대상 장부 정화 연산 가동");
            reservationService.processChargingTimeout();
        } catch (Exception e) {
            log.error("[❌ BATCH-STEP 1 ERROR] 충전 상태 변경 및 알림 정화 처리 중 시스템 예외 발생: {}", e.getMessage(), e);
        }
        
        // 파트 2: 예약 시작 15분 전 사전 차량 입고 안내 알림 집행
        try {
            log.info("[▶ BATCH-STEP 2] 예약 시작 15분 전 사전 차량 입고 안내 연산 가동");
            reservationService.processEntryNotice15MinsBefore();
        } catch (Exception e) {
            log.error("[❌ BATCH-STEP 2 ERROR] 15분 전 입고 안내 처리 중 시스템 예외 발생: {}", e.getMessage(), e);
        }
        
        log.info("[✅ BATCH] 5분 주기 예약 시스템 통합 관리 자동화 배치 프로세스 정상 종료");
    }
}