package com.boot.ev_charge.reservation;

import java.sql.Timestamp;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.station.StationDto;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ReservationService {

    @Autowired
    private ReservationMapper reservationMapper;

    // =========================================================================
    // 1. 예약 생성 (TIME / TARGET 통합 유효성 검증 및 중복 차단 완결판)
    // =========================================================================
    @Transactional
    public void createReservation(ReservationDto dto) {

        // 🟢 [버그 해결 1] TIME이든 TARGET이든 상관없이 "시간 데이터"가 들어왔다면 무조건 중복 검사와 유효성 검증을 거치도록 격벽 해제!
        if (dto.getStartTime() != null && dto.getEndTime() != null) {

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

            // 디버깅용 로그 콘솔 출력
            log.info("## [백엔드 검증진입] 데이터 포맷 확인 완료");
            log.info("👉 chargerId: {}, type: {}", dto.getChargerId(), dto.getReservationType());
            log.info("👉 startTime: {} / endTime: {}", dto.getStartTime(), dto.getEndTime());

            // 중복 예약 검증 실행 (이제 TARGET 모드로 들어와도 철저하게 중복을 잡아냅니다)
            int count = reservationMapper.countDuplicateReservation(dto);
            if (count > 0) {
                throw new RuntimeException("이미 예약된 시간입니다.");
            }
        } else {
            // 시간 데이터 자체가 유실되어 넘어온 경우 원천 차단
            throw new RuntimeException("예약 시간 정보가 누락되었습니다.");
        }

        // 2. 공통 예약 마스터 테이블 저장 (부모 인서트하여 ID 생성)
        reservationMapper.insertReservation(dto);

        // 3. 타입별 상세 테이블 저장 및 교차 저장 처리
        if ("TIME".equals(dto.getReservationType())) {
            // [시간 지정 예약] -> 시간 테이블에 기록
            reservationMapper.insertReservationTime(dto);
            
        } else if ("TARGET".equals(dto.getReservationType())) {
            // [목표 충전량 예약] 
            
            // ① 목표 사양 상세 테이블 저장 (기존 코드)
            reservationMapper.insertReservationTarget(dto);
            
            // 🟢 [버그 해결 2] 의사일정 스케줄러와 타임라인 화면(회색 장벽)이 정상 인식하도록 
            // 목표 충전량 모드일 때도 시간대 테이블(reservation_time)에 시작/종료 시간을 무조건 함께 밀어 넣습니다!
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
    
    // 10. 충전소 목록 조회
    public List<StationDto> getStationList() {
        return reservationMapper.getStationList();
    }

    // =========================================================================
    // 11. 충전소별 충전기 목록 조회 (v1.9 최종 가용 결속판)
    // =========================================================================
    public List<ChargerDto> getChargersByStationId(Long stationId, String date) {
        // 파라미터가 2개 이상이므로 MyBatis에 안전하게 넘기기 위해 Map을 생성합니다.
        java.util.Map<String, Object> params = new java.util.HashMap<>();
        params.put("stationId", stationId);
        params.put("date", date);
        
        // 🟢 [완전 해결] 옛날 메서드가 아니라, 새 쿼리를 뿜어주는 매퍼 메서드로 명확하게 리턴 대상을 치환합니다!
        return reservationMapper.getChargerListWithSoldOutCheck(params);
    }
    
 // =========================================================================
    // 🌟 목표 충전량에 따른 예상 소요 시간 계산 메서드 (과도한 시간 뻥튀기 방지 보정판)
    // =========================================================================
    public int calculateRequiredMinutes(Integer targetPercent, double chargerKw) {
        if (targetPercent == null || targetPercent <= 0) return 0;
        
        double batteryCapacity = 70.0; 
        double currentPercent = 0.0;  // 기준 시작 잔량 0%
        
        if (targetPercent <= currentPercent) return 0;
        
        // 1. 순수 필요 충전량 및 소요 시간 계산
        double requiredKwh = batteryCapacity * ((targetPercent - currentPercent) / 100.0);
        double durationHours = requiredKwh / chargerKw;
        
        // 기본 분 단위 변환
        int requiredMinutes = (int) Math.ceil(durationHours * 60);
        
        // 2. 급속(chargerKw가 50kW 이상인 경우) 환경에서만 80% 초과 지연 가중치 적용
        // 완속(7kW)은 원래 느리므로 가중치를 주면 시간이 너무 과하게 늘어납니다.
        if (chargerKw >= 50 && targetPercent > 80) {
            double overEightyKwh = batteryCapacity * ((targetPercent - 80) / 100.0);
            double extraHours = (overEightyKwh / chargerKw) * 0.5; 
            requiredMinutes += (int) Math.ceil(extraHours * 60);
        }
        
        // 3. 안전 버퍼는 딱 깔끔하게 10분만 추가 (오버타임 방지)
        requiredMinutes += 10;
        
        log.info("## [소요시간 계산결과] 목표: {}%, 충전기출력: {}kW -> 최종 계산된 분: {}분 ({}시간 {}분)", 
                 targetPercent, chargerKw, requiredMinutes, (requiredMinutes/60), (requiredMinutes%60));
        
        return requiredMinutes;
    }
}