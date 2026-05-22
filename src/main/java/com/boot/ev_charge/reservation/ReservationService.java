package com.boot.ev_charge.reservation;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {

    @Autowired
    private ReservationMapper reservationMapper;


    // 예약 생성
    @Transactional
    public void createReservation(ReservationDto dto) {

        // 시간 예약 중복 검사
        if ("TIME".equals(dto.getReservationType())) {

            int count = reservationMapper.countDuplicateReservation(dto);

            if (count > 0) {
                throw new RuntimeException("이미 예약된 시간입니다.");
            }
        }

        // 공통 예약 생성
        reservationMapper.insertReservation(dto);


        // 시간 예약 생성
        if ("TIME".equals(dto.getReservationType())) {

        	reservationMapper.insertReservationTime(dto);
        }


        // 목표 충전량 예약 생성
        if ("TARGET".equals(dto.getReservationType())) {

        	reservationMapper.insertReservationTarget(dto);
        }
    }


    // 예약 상세 조회
    public ReservationDto getReservationDetail(Long reservationId) {

        return reservationMapper.getReservationDetail(reservationId);
    }


    // 회원 예약 목록 조회
    public List<ReservationDto> getReservationListByUser(Long userId) {

        return reservationMapper.getReservationListByUser(userId);
    }


    // 충전 시작
    public void startCharging(Long reservationId) {

    	reservationMapper.startCharging(reservationId);
    }


    // 충전 완료
    public void completeCharging(Long reservationId) {

    	reservationMapper.completeCharging(reservationId);
    }


    // 예약 취소
    public void cancelReservation(Long reservationId) {

    	reservationMapper.cancelReservation(reservationId);
    }


    // 예약 자동 만료 처리
    @Scheduled(fixedRate = 60000)
    public void expireReservation() {

    	reservationMapper.expireReservation();
    }
}