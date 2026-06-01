package com.boot.ev_charge.reservation;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * [RESERVATION SYSTEM] 예약 및 충전 상태 자동 관리 백그라운드 배치 사령탑
 * 규칙: 매 분 0초마다 주기적으로 기동하여 시간 만료 처리 및 사전 알림을 트리거합니다.
 */
@Component
@Slf4j
public class ReservationScheduler {

    @Autowired
    private ReservationService reservationService; // 비즈니스 로직 위임을 위한 의존성 주입

    /**
     * 업무 1: 충전 시간 만료 자동 마감 배치 (매 분 0초 가동)
     * 논리: 상태가 'CHARGING'이면서 설정된 종료 시간이 지난 예약을 자동 'COMPLETED' 처리
     */
    @Scheduled(cron = "0 * * * * *")
    public void executeChargingTimeoutCheck() {
        log.info("[⏰ BATCH] 충전 시간 만료 자동 마감 배치 프로세스 가동 시작");
        
        try {
            // 실제 데이터 정산, DB 상태 변경, 실시간 알림 발송은 서비스 레이어로 완전히 위임
            reservationService.processChargingTimeout();
            
            log.info("[✅ BATCH] 충전 시간 만료 자동 마감 배치 프로세스 정상 종료");
        } catch (Exception e) {
            // 백그라운드 배치는 사용자 화면이 없으므로 에러가 나도 서버가 죽지 않도록 완벽한 예외 방어막 구축 필수
            log.error("[❌ BATCH ERROR] 충전 시간 만료 배치 처리 중 시스템 예외 발생: {}", e.getMessage(), e);
        }
    }

    /**
     * 업무 2: 예약 15분 전 차량 입고 사전 안내 배치 (매 분 0초 가동)
     * 논리: 현재 시간 기준 정확히 15분 뒤에 충전이 시작되는 예약자들에게 사전 푸시 알림 발송
     */
    @Scheduled(cron = "0 * * * * *")
    public void executeEntryNotice15MinsBefore() {
        log.info("[⏰ BATCH] 예약 15분 전 차량 입고 안내 배치 프로세스 가동 시작");
        
        try {
            // 실시간 스트림 알림 및 보관함 적재 로직 호출
            reservationService.processEntryNotice15MinsBefore();
            
            log.info("[✅ BATCH] 예약 15분 전 차량 입고 안내 배치 프로세스 정상 종료");
        } catch (Exception e) {
            log.error("[❌ BATCH ERROR] 15분 전 입고 안내 배치 처리 중 시스템 예외 발생: {}", e.getMessage(), e);
        }
    }
    @Scheduled(cron = "0 */5 * * * *")
    public void executeReservationBatchProcess() {
        // 5분마다 깨어나서 [15분전 체크] -> [시작 시간 체크] -> [종료 시간 체크] 파이프라인 가동
    }
}