package com.boot.ev_charge.reservation;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private UserService userService;

    @Autowired
    private ReservationService reservationService;

    // 예약 페이지
    @GetMapping("")
    public String reservationPage() {
    	log.info("@# @# [GET] /reservation -> reservationPage() 호출");
    	log.info("@# 리턴할 뷰 경로: reservation/reservation");
    	
        return "reservation/reservation";
    }

    // 예약 생성
    @PostMapping("/create")
    public String createReservation(ReservationDto reservationDto, @AuthenticationPrincipal UserDetails userDetails) {

        System.out.println("로그인 유저 = " + userDetails.getUsername());

        // login_id 기준으로 회원 조회
        UserDto user = userService.findByLoginId(userDetails.getUsername());

        // DTO에 user_id 세팅
        reservationDto.setUserId(user.getId());

        reservationService.createReservation(reservationDto);

        return "redirect:/reservation/my";
    }
    
    // 예약 목록
    @GetMapping("/my")
    public String myReservation(@AuthenticationPrincipal UserDetails userDetails, Model model) {
    	log.info("@# [GET] /reservation/my -> myReservation() 호출");
    	
    	if (userDetails == null) {
    		log.warn("@# [경고] 내 예약 목록 요청했으나 세션 없음");
    		return "redirect:/login?loginRequired=true";
		}
    	
    	// 로그인 사용자 조회
    	String loginId = userDetails.getUsername();
    	UserDto user = userService.findByLoginId(loginId);
    	log.info("@# 내 예약 조회 대상 회원 식별 ID: {}", user.getId());
    	
    	// 예약 목록 조회
    	List<ReservationDto> reservationList = reservationService.getReservationListByUser(user.getId());
    	log.info("@# 조회된 예약 건수: {}건", reservationList != null ? reservationList.size() : 0);
    	
    	model.addAttribute("reservationList", reservationList);
    	log.info("@# 리턴할 뷰 경로: reservation/myReservation");
    	
    	return "reservation/myReservation";
    }

    // 예약 상세 조회
    @GetMapping("/{reservationId}")
    public String getReservationDetail(@PathVariable Long reservationId, Model model) {
    	log.info("@# [GET] /reservation/{} -> getReservationDetail() 호출", reservationId);

    	ReservationDto reservation = reservationService.getReservationDetail(reservationId);
    	log.info("@# 조회된 상세 데이터: {}", reservation);
    	
    	model.addAttribute("reservation", reservation);
    	log.info("@# 리턴할 뷰 경로: reservation/reservationDetail");
    	
        return "reservation/reservationDetail";
    }

    // 충전 시작
    @PostMapping("/start/{reservationId}")
    public String startCharging(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/start/{} -> startCharging() 호출", reservationId);

        reservationService.startCharging(reservationId);
        log.info("@# 충전 시작 상태 변경 완료 -> 목록으로 리다이렉트");

        return "redirect:/reservation/my";
    }

    // 충전 완료
    @PostMapping("/complete/{reservationId}")
    public String completeCharging(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/complete/{} -> completeCharging() 호출", reservationId);

        reservationService.completeCharging(reservationId);
        log.info("@# 충전 완료 상태 변경 완료 -> 목록으로 리다이렉트");

        return "redirect:/reservation/my";
    }

    // 예약 취소
    @PostMapping("/cancel/{reservationId}")
    public String cancelReservation(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/cancel/{} -> cancelReservation() 호출", reservationId);

        reservationService.cancelReservation(reservationId);
        log.info("@# 예약 취소 완료 -> 목록으로 리다이렉트");

        return "redirect:/reservation/my";
    }
}