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

@Controller
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private UserService userService;

    @Autowired
    private ReservationService reservationService;

    // 예약 페이지
    @GetMapping("")
    public String reservationPage() {
        return "reservation/reservation";
    }

    // 예약 생성
    @PostMapping("/create")
    public String createReservation(ReservationDto dto, @AuthenticationPrincipal UserDetails userDetails) {
    	
    	if (userDetails == null) {
			return "redirect:/login?loginRequired=true";
		}

    	// 로그인 사용자 조회
    	String loginId = userDetails.getUsername();
    	UserDto user = userService.findByLoginId(loginId);
    	
    	// 예약자 세팅
    	dto.setUserId(user.getId());
    	reservationService.createReservation(dto);
    	
        return "redirect:/reservation/my";
    }
    
    // 예약 목록
    @GetMapping("/my")
    public String myReservation(@AuthenticationPrincipal UserDetails userDetails, Model model) {
    	
    	// 로그인 사용자 조회
    	String loginId = userDetails.getUsername();
    	
    	UserDto user = userService.findByLoginId(loginId);
    	
    	// 예약 목록 조회
    	List<ReservationDto> reservationList = reservationService.getReservationListByUser(user.getId());
    	
    	model.addAttribute("reservationList", reservationList);
    	
    	return "reservation/myReservation";
    }

    // 예약 상세 조회
    @GetMapping("/{reservationId}")
    public String getReservationDetail(@PathVariable Long reservationId, Model model) {

    	ReservationDto reservation = reservationService.getReservationDetail(reservationId);
    	
    	model.addAttribute("reservation", reservation);
    	
        return "reservation/reservationDetail";
    }

    // 충전 시작
    @PostMapping("/start/{reservationId}")
    public String startCharging(@PathVariable Long reservationId) {

        reservationService.startCharging(reservationId);

        return "redirect:/reservation/my";
    }

    // 충전 완료
    @PostMapping("/complete/{reservationId}")
    public String completeCharging(@PathVariable Long reservationId) {

        reservationService.completeCharging(reservationId);

        return "redirect:/reservation/my";
    }

    // 예약 취소
    @PostMapping("/cancel/{reservationId}")
    public String cancelReservation(@PathVariable Long reservationId) {

        reservationService.cancelReservation(reservationId);

        return "redirect:/reservation/my";
    }
}