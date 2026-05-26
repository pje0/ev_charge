package com.boot.ev_charge.reservation;

import java.sql.Timestamp;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.boot.ev_charge.station.ChargerDto;

@Service
public class ReservationService {

    @Autowired
    private ReservationMapper ReservationMapper;


    // 예약 생성
    @Transactional
    public void createReservation(ReservationDto dto) {

        // 1. 기본 검증 먼저
        if ("TIME".equals(dto.getReservationType())) {

<<<<<<< feature/조성민
            int startMinute = dto.getStartTime().toLocalDateTime().getMinute();
            int endMinute = dto.getEndTime().toLocalDateTime().getMinute();
=======
            int count = ReservationMapper.countDuplicateReservation(dto);
>>>>>>> 5a22b00 도중 저장

            if (!((startMinute == 0 || startMinute == 30) && (endMinute == 0 || endMinute == 30))) {
                throw new RuntimeException("30분 단위 예약만 가능합니다.");
            }

            if (!dto.getEndTime().after(dto.getStartTime())) {
                throw new RuntimeException("종료시간은 시작 시간 이후여야 합니다.");
            }

            if (dto.getStartTime().before(new Timestamp(System.currentTimeMillis()))) {
                throw new RuntimeException("과거 시간은 예약할 수 없습니다.");
            }

            int count = reservationMapper.countDuplicateReservation(dto);
            if (count > 0) {
                throw new RuntimeException("이미 예약된 시간입니다.");
            }
        }

<<<<<<< feature/조성민
        // 2. DB 저장은 마지막 1번만
        reservationMapper.insertReservation(dto);
=======
        // 공통 예약 생성
        ReservationMapper.insertReservation(dto);
>>>>>>> 5a22b00 도중 저장

        if ("TIME".equals(dto.getReservationType())) {
<<<<<<< feature/조성민
            reservationMapper.insertReservationTime(dto);
        } else if ("TARGET".equals(dto.getReservationType())) {
            reservationMapper.insertReservationTarget(dto);
=======

        	ReservationMapper.insertReservationTime(dto);
        }


        // 목표 충전량 예약 생성
        if ("TARGET".equals(dto.getReservationType())) {

        	ReservationMapper.insertReservationTarget(dto);
>>>>>>> 5a22b00 도중 저장
        }
    }


    // 예약 상세 조회
    public ReservationDto getReservationDetail(Long reservationId) {

        return ReservationMapper.getReservationDetail(reservationId);
    }


    // 회원 예약 목록 조회
    public List<ReservationDto> getReservationListByUser(Long userId) {

        return ReservationMapper.getReservationListByUser(userId);
    }


    // 충전 시작
    public void startCharging(Long reservationId) {

    	ReservationMapper.startCharging(reservationId);
    }


    // 충전 완료
    public void completeCharging(Long reservationId) {

    	ReservationMapper.completeCharging(reservationId);
    }


    // 예약 취소
    public void cancelReservation(Long reservationId) {

    	ReservationMapper.cancelReservation(reservationId);
    }


    // 예약 자동 만료 처리 (예약 시간이 지날 시 자동 만료)
//    @Scheduled(fixedRate = 60000)
//    public void expireReservation() {
//
//    	reservationMapper.expireReservation();
//    }
    
    // 충전기 목록 조회
    public List<ChargerDto> getChargerList() {

<<<<<<< feature/조성민
        return reservationMapper.getChargerList();
    }
    
    public List<ReservationDto> getReservedTimes(Long chargerId, String date) {
        return reservationMapper.getReservedTimes(chargerId, date);
=======
    	ReservationMapper.expireReservation();
>>>>>>> 5a22b00 도중 저장
    }
}