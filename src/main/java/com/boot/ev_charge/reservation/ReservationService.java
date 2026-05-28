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
    
    // 10. 충전소 목록 조회
    public List<StationDto> getStationList() {
        return reservationMapper.getStationList();
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
}