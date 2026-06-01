package com.boot.ev_charge.reservation;

import java.sql.Timestamp;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.boot.ev_charge.notification.NotificationDTO;
import com.boot.ev_charge.notification.NotificationService;
import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.station.StationDto;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ReservationService {

    private final NotificationService notificationService;

    @Autowired
    private ReservationMapper reservationMapper;

    ReservationService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // 1. 예약 생성
    @Transactional
    public void createReservation(ReservationDto dto) {

        // 🌟 [버그 수리 1] "TIME" 조건문을 뜯어내어, "TARGET" 예약일 때도 무조건 시간 유효성 및 중복 검사를 수행하게 만듭니다.
        int startMinute = dto.getStartTime().toLocalDateTime().getMinute();
        int endMinute = dto.getEndTime().toLocalDateTime().getMinute();

        // 30분 단위 검증
        if (!((startMinute == 0 || startMinute == 30) && (endMinute == 0 || endMinute == 30))) {
            throw new RuntimeException("30분 단위 예약만 가능합니다.");
        }

        // 시간 순서 검증
        if (!dto.getEndTime().after(dto.getStartTime())) {
            throw new RuntimeException("종료시간은 시작 시간 이후여야 합니다.");
        }

        // 과거 시간 검증
        if (dto.getStartTime().before(new Timestamp(System.currentTimeMillis()))) {
            throw new RuntimeException("과거 시간은 예약할 수 없습니다.");
        }

        // 중복 예약 검증
        int count = reservationMapper.countDuplicateReservation(dto);
        if (count > 0) {
            throw new RuntimeException("이미 예약된 시간입니다.");
        }

        // 2. 공통 예약 마스터 테이블 저장 (무조건 1번만 실행)
        reservationMapper.insertReservation(dto);

        // 3. 타입별 상세 테이블 저장
        if ("TIME".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTime(dto);
        } else if ("TARGET".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTarget(dto);
            // 🌟 [버그 수리 2 핵심] TARGET 예약도 타임 슬롯을 점유해야 하므로 Time 테이블에 함께 기록을 남겨줍니다!
            reservationMapper.insertReservationTime(dto);
        }
    }

    // 2. 예약 상세 조회
    public ReservationDto getReservationDetail(Long reservationId) {
        return reservationMapper.getReservationDetail(reservationId);
    }

    // 3. 회원 예약 목록 조회
    public List<ReservationDto> getReservationListByUser(Long userId) {
        return reservationMapper.getReservationListByUser(userId);
    }

    // 4. 충전 시작
    public void startCharging(Long reservationId) {
        reservationMapper.startCharging(reservationId);
    }

    // 5. 충전 완료
    public void completeCharging(Long reservationId) {
        reservationMapper.completeCharging(reservationId);
    }

    // 6. 예약 취소
    public void cancelReservation(Long reservationId) {
        reservationMapper.cancelReservation(reservationId);
    }

    // 8. 충전기 목록 조회
    public List<ChargerDto> getChargerList() {
        return reservationMapper.getChargerList();
    }
    
    // 9. 특정 충전기의 날짜별 예약된 시간 목록 조회 (Ajax 연동용)
    public List<ReservationDto> getReservedTimes(Long chargerId, Long stationId, String date) {
        
        log.info("## [Service] getReservedTimes 가동 -> chargerId: {}, stationId: {}, date: {}", chargerId, stationId, date);
        
        try {
            List<ReservationDto> dtoList = reservationMapper.getReservedTimes(chargerId, stationId, date);
            
            if (dtoList == null) {
                return new java.util.ArrayList<>();
            }
            
            log.info("## [Service] 조회된 예약 개수: {}개", dtoList.size());
            return dtoList;
            
        } catch (Exception e) {
            log.error("## [Service 오류] getReservedTimes 연산 실패: {}", e.getMessage(), e);
            return new java.util.ArrayList<>();
        }
    }
    
    // =========================================================================
    // 🟢 1. 시/도 목록 조회 서비스 비즈니스 로직
    // =========================================================================
    public List<String> getSidoList() {
        log.info("⚙️ [Service] getSidoList() 호출: DB에서 중복 없는 시/도(metro) 목록 조회를 시작합니다.");
        
        // Mapper를 호출하여 시/도 목록 데이터 질의 및 추출
        List<String> sidoList = reservationMapper.getSidoList();
        
        log.info("✅ [Service] getSidoList() 완료: 총 {} 건의 시/도 데이터 추출 성공", sidoList.size());
        
        // 컨트롤러로 최종 추출된 데이터 리스트 반환
        return sidoList;
    }

    // =========================================================================
    // 🟢 2. 특정 시/도에 종속된 시/군/구 목록 조회 서비스 비즈니스 로직
    // =========================================================================
    public List<String> getSigunguList(String metro) {
        log.info("⚙️ [Service] getSigunguList() 호출: 파라미터 [metro: {}] 기준으로 시/군/구 조회를 시작합니다.", metro);
        
        // 🛑 파라미터 유효성 검증 1차 방어 로직 (null 또는 공백 체크)
        if (metro == null || metro.trim().isEmpty()) {
            log.warn("⚠️ [Service Warning] 파라미터 누락: 시/도(metro) 값이 존재하지 않아 조회를 취소하고 빈 리스트를 반환합니다.");
            // 비정상적인 접근 시 NullPointerException 방지를 위해 안전한 빈 리스트 반환
            return Collections.emptyList();
        }

        // Mapper를 호출하여 조건에 맞는 시/군/구 목록 데이터 질의 및 추출
        List<String> sigunguList = reservationMapper.getSigunguList(metro);
        
        log.info("✅ [Service] getSigunguList() 완료: '{}' 지역 내 총 {} 건의 시/군/구 데이터 추출 성공", metro, sigunguList.size());
        
        // 컨트롤러로 추출된 데이터 리스트 반환
        return sigunguList;
    }

    // =========================================================================
    // 🟢 3. 동적 필터링 조건에 맞춘 충전소 목록 조회 서비스 비즈니스 로직
    // =========================================================================
    public List<StationDto> getStationList(Map<String, Object> params) {
        log.info("⚙️ [Service] getStationList() 호출: 전달받은 필터 파라미터 {} 기준으로 충전소 목록 조회를 시작합니다.", params);
        
        // 🛑 파라미터 객체 널 체크 방어 로직
        if (params == null) {
            log.error("❌ [Service Error] 필터 파라미터(Map) 객체가 null입니다. 빈 리스트를 반환합니다.");
            return Collections.emptyList();
        }

        // Mapper를 호출하여 필터(시/도, 시/군/구, 충전속도) 조건이 완벽히 적용된 충전소 리스트 질의 및 추출
        List<StationDto> stationList = reservationMapper.getStationList(params);
        
        log.info("✅ [Service] getStationList() 완료: 조건에 부합하는 총 {} 건의 충전소 데이터 추출 성공", stationList.size());
        
        // 컨트롤러로 추출된 충전소 DTO 리스트 반환
        return stationList;
    }

    // 11. 충전소별 충전기 목록 조회
    public List<ChargerDto> getChargersByStationId(Long stationId) {
        return reservationMapper.getChargersByStationId(stationId);
    }
    
    // 🌟 목표 충전량에 따른 예상 소요 시간 계산 메서드
    public int calculateRequiredMinutes(Integer targetPercent, double chargerKw) {
        if (targetPercent == null || targetPercent <= 0) return 0;
        
        double batteryCapacity = 70.0; 
        double currentPercent = 20.0;  
        
        if (targetPercent <= currentPercent) return 0;
        
        double requiredKwh = batteryCapacity * ((targetPercent - currentPercent) / 100.0);
        
        double durationHours = requiredKwh / chargerKw;
        int requiredMinutes = (int) Math.ceil(durationHours * 60);
        
        if (targetPercent > 80 && chargerKw >= 50) {
            double overEightyKwh = batteryCapacity * ((targetPercent - 80) / 100.0);
            double extraHours = (overEightyKwh / chargerKw) * 0.5; 
            requiredMinutes += (int) Math.ceil(extraHours * 60);
        }
        
        requiredMinutes += 15;
        
        return requiredMinutes;
    }

    // [관리자 전용] 조건별 전체 예약 리스트 서비스
    public List<ReservationDto> getAdminReservationList(String searchStatus, String searchType, String searchKeyword) {
        return reservationMapper.getAdminReservationList(searchStatus, searchType, searchKeyword);
    }

    // [관리자 전용] 예약 데이터 강제 삭제 서비스 (트랜잭션 보장)
    @Transactional
    public boolean deleteAdminReservation(Long reservationId) {
        return reservationMapper.deleteReservationById(reservationId) > 0;
    }
    
 // =====================================================
    // 🟢 예약 수정 비즈니스 로직 추가
    // =====================================================
    @Transactional
    public void updateReservation(ReservationDto dto) {
        log.info("## [Service] 예약 수정 로직 가동 -> Reservation ID: {}", dto.getId());

        // 1. (선택 사항) TIME 타입일 경우 시간 유효성 및 중복 검사 로직 재수행 가능 
        // (createReservation에 있던 검증 로직을 별도 메서드로 빼서 재사용하면 더 좋습니다)

        // 2. 예약 마스터 테이블 타입 업데이트
        reservationMapper.updateReservationMaster(dto);

        // 3. 기존 하위 상세 데이터 완전히 삭제 (초기화)
        reservationMapper.deleteReservationTimeByResId(dto.getId());
        reservationMapper.deleteReservationTargetByResId(dto.getId());

        // 4. 새로운 예약 데이터 인서트
        if ("TIME".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTime(dto);
        } else if ("TARGET".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTarget(dto);
            // TARGET 예약도 타임 슬롯을 점유해야 하므로 Time 테이블에 함께 기록
            reservationMapper.insertReservationTime(dto);
        }
        
        log.info("## [Service] 예약 수정 완료 -> Reservation ID: {}", dto.getId());
    }
    
    public Map<String, Object> getMypageStats(Long userId) {
        log.info("📊 [Service] 마이페이지 실시간 통계 연산 가동 -> User ID: {}", userId);
        
        // DB에서 통계 데이터 맵 수신
        Map<String, Object> statsMap = reservationMapper.getUserChargeStatistics(userId);
        
        // 만약 충전 내역이 아예 없는 신규 회원의 경우 null 리턴 대비 방어막 구축
        if (statsMap == null) {
            log.warn("⚠️ [Service] 조회된 통계 데이터가 없어 기본값(0)으로 초기화 맵을 생성합니다.");
            statsMap = new HashMap<>();
            statsMap.put("totalChargeCount", 0);
            statsMap.put("totalChargeKw", 0.0);
            statsMap.put("savedCarbon", 0.0);
        }
        
        log.info("✅ [Service] 통계 계산 완료 -> 횟수: {}회, 총량: {}kWh, 탄소: {}kg", 
                 statsMap.get("totalChargeCount"), statsMap.get("totalChargeKw"), statsMap.get("savedCarbon"));
                 
        return statsMap;
    }
    // 🚨 [완성] 1. 충전 시작 및 만료 자동 상태 변경 배치 비즈니스 집행부 (5분 주기 가동)
    @Transactional
    public void processChargingTimeout() {
        log.info("⚙️ [Service 배치] processChargingTimeout() 가동: 시작/종료 시간 도래 건 장부 정리 및 알림 처리를 시작합니다.");
        
        // ---------------------------------------------------------------------
        // 파트 A: [충전 시작 시간 도래] RESERVED -> CHARGING 자동 상태 전환
        // ---------------------------------------------------------------------
        try {
            // 매퍼 인터페이스에 추가할 신규 메서드 (시작 시간이 되었거나 지난 RESERVED 목록 조회)
            List<ReservationDto> startTargets = reservationMapper.findChargingStartList();
            
            if (startTargets != null && !startTargets.isEmpty()) {
                log.info("▶ [배치-시작] 현재 시점 충전 시작 대상 건수: {}건", startTargets.size());
                for (ReservationDto target : startTargets) {
                    try {
                        // 1. 단건 상태 변경 (status='CHARGING', actual_start_time=now())
                        reservationMapper.startCharging(target.getId());
                        
                        // 2. 로그인 상태인 유저에게 실시간 웹 알림 발송 (문자열 계정 ID 검증)
                        if (target.getLoginId() != null && !target.getLoginId().trim().isEmpty()) {
                            NotificationDTO startAlarm = NotificationDTO.builder()
                                    .userId(target.getUserId())
                                    .type("CHARGE_START") // 💡 프론트엔드 약속 규격
                                    .title("⚡ 충전 시작 안내")
                                    .content(String.format("[%s] 에서 차량 충전이 정상적으로 시작되었습니다.", target.getStationName()))
                                    .referenceId(target.getId())
                                    .referenceType("CHARGE")
                                    .isRead("N")
                                    .build();
                            
                            notificationService.sendRealtimeNotice(target.getLoginId(), startAlarm);
                        }
                    } catch (Exception e) {
                        // 개별 유저의 알림 전송 실패(웹브라우저 닫음 등) 시 로그만 남기고 다음 루프로 안전하게 토스
                        log.warn("⚠️ [배치-시작 건별 예외] 예약 ID {}번 알림 전송 스킵 (사용자 오프라인 상태): {}", target.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("❌ [배치-시작 파트 에러] 충전 시작 프로세스 중 예외 발생: {}", e.getMessage(), e);
        }

        // ---------------------------------------------------------------------
        // 파트 B: [충전 종료 시간 도래] CHARGING -> COMPLETED 자동 만료 전환
        // ---------------------------------------------------------------------
        try {
            // 아까 매퍼 인터페이스에 추가하기로 선언한 만료 타겟 조회 메서드 호출
            List<ReservationDto> endTargets = reservationMapper.findChargingTimeoutList();
            
            if (endTargets != null && !endTargets.isEmpty()) {
                log.info("▶ [배치-종료] 현재 시점 충전 종료 대상 건수: {}건", endTargets.size());
                for (ReservationDto target : endTargets) {
                    try {
                        // 1. 단건 상태 변경 및 차선책 종료 도장 (status='COMPLETED', actual_end_time=now())
                        // 기존 컨트롤러 버튼과 공용으로 쓰던 메서드를 그대로 영리하게 재사용합니다.
                        reservationMapper.completeCharging(target.getId());
                        
                        // 2. 로그인 상태인 유저에게 실시간 웹 알림 발송
                        if (target.getLoginId() != null && !target.getLoginId().trim().isEmpty()) {
                            NotificationDTO completeAlarm = NotificationDTO.builder()
                                    .userId(target.getUserId())
                                    .type("CHARGE_COMPLETE") // 💡 프론트엔드 번개 기호(⚡) 연동
                                    .title("⚡ 충전 완료 안내")
                                    .content(String.format("[%s] 차량 충전이 완료되었습니다. 다음 이용자를 위해 이동해 주세요.", target.getStationName()))
                                    .referenceId(target.getId())
                                    .referenceType("CHARGE")
                                    .isRead("N")
                                    .build();
                            
                            notificationService.sendRealtimeNotice(target.getLoginId(), completeAlarm);
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ [배치-종료 건별 예외] 예약 ID {}번 알림 전송 스킵 (사용자 오프라인 상태): {}", target.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("❌ [배치-종료 파트 에러] 충전 종료 프로세스 중 예외 발생: {}", e.getMessage(), e);
        }
    }

    // =========================================================================
    // 🚨 [완성] 2. 예약 15분 전 차량 입고 사전 안내 배치 비즈니스 집행부 (5분 주기 가동)
    // =========================================================================
    public void processEntryNotice15MinsBefore() {
        log.info("⚙️ [Service 배치] processEntryNotice15MinsBefore() 가동: 15분 전 입고 안내 대상 탐색을 시작합니다.");
        
        try {
            // 5분 배치 주기와 30분 단위 예약 스펙이 만나 '현재시간 + 15분' 정밀 타격 쿼리 호출
            List<ReservationDto> noticeTargets = reservationMapper.findReservationsStartingIn15Minutes();
            
            if (noticeTargets != null && !noticeTargets.isEmpty()) {
                log.info("▶ [배치-15분전] 사전 차량 입고 안내 대상 건수: {}건", noticeTargets.size());
                for (ReservationDto target : noticeTargets) {
                    try {
                        // 단순 안내 푸시이므로 DB 상태 변경 없이 오직 실시간 알림만 가동
                        if (target.getLoginId() != null && !target.getLoginId().trim().isEmpty()) {
                            NotificationDTO entryAlarm = NotificationDTO.builder()
                                    .userId(target.getUserId())
                                    .type("RESERVATION_BEFORE") // 💡 프론트엔드 자동차 기호(🚗) 연동
                                    .title("🚗 차량 입고 안내")
                                    .content(String.format("예약 시간 15분 전입니다. 원활한 이용을 위해 [%s] 구역에 입고해 주세요.", target.getStationName()))
                                    .referenceId(target.getId())
                                    .referenceType("RESERVATION")
                                    .isRead("N")
                                    .build();
                            
                            notificationService.sendRealtimeNotice(target.getLoginId(), entryAlarm);
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ [배치-15분전 건별 예외] 예약 ID {}번 15분 전 알림 전송 실패: {}", target.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("❌ [배치-15분전 에러] 15분 전 차량 입고 안내 프로세스 중 시스템 예외 발생: {}", e.getMessage(), e);
        }
    }
}