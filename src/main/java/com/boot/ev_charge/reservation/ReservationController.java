package com.boot.ev_charge.reservation;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;


    // 예약 생성
    @PostMapping("/create")
    public String createReservation(@RequestBody ReservationDto dto) {

        reservationService.createReservation(dto);

        return "예약 완료";
    }


    // 예약 상세 조회
    @GetMapping("/{reservationId}")
    public ReservationDto getReservationDetail(
            @PathVariable Long reservationId) {

        return reservationService.getReservationDetail(reservationId);
    }


    // 회원 예약 목록 조회
    @GetMapping("/user/{userId}")
    public List<ReservationDto> getReservationListByUser(
            @PathVariable Long userId) {

        return reservationService.getReservationListByUser(userId);
    }


    // 충전 시작
    @PostMapping("/start/{reservationId}")
    public String startCharging(@PathVariable Long reservationId) {

        reservationService.startCharging(reservationId);

        return "충전 시작";
    }


    // 충전 완료
    @PostMapping("/complete/{reservationId}")
    public String completeCharging(@PathVariable Long reservationId) {

        reservationService.completeCharging(reservationId);

        return "충전 완료";
    }


    // 예약 취소
    @PostMapping("/cancel/{reservationId}")
    public String cancelReservation(@PathVariable Long reservationId) {

        reservationService.cancelReservation(reservationId);

        return "예약 취소 완료";
    }
}