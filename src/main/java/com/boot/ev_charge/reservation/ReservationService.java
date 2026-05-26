package com.boot.ev_charge.reservation;

import java.sql.Timestamp;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.boot.ev_charge.station.ChargerDto;

@Service
public class ReservationService {

    @Autowired
    private ReservationMapper reservationMapper; // 🌟 대소문자 표기법 하나로 통일 (reservationMapper)

    // 1. 예약 생성
    @Transactional
    public void createReservation(ReservationDto dto) {

        // [시간 예약(TIME)인 경우 유효성 검증]
        if ("TIME".equals(dto.getReservationType())) {

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
        }

        // 2. 공통 예약 마스터 테이블 저장 (무조건 1번만 실행)
        reservationMapper.insertReservation(dto);

        // 3. 타입별 상세 테이블 저장
        if ("TIME".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTime(dto);
        } else if ("TARGET".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTarget(dto);
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

    // 7. 예약 자동 만료 처리 스케줄러 (필요 시 주석 해제하여 사용 가능)
    // @Scheduled(fixedRate = 60000)
    public void expireReservation() {
        reservationMapper.expireReservation();
    }
    
    // 8. 충전기 목록 조회
    public List<ChargerDto> getChargerList() {
        return reservationMapper.getChargerList();
    }
    
    // 9. 특정 충전기의 날짜별 예약된 시간 목록 조회 (Ajax 연동용)
    public List<ReservationDto> getReservedTimes(Long chargerId, String date) {
        return reservationMapper.getReservedTimes(chargerId, date);
    }
}