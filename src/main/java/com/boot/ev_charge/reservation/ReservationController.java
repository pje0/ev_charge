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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private UserService userService; // 🌟 누락되었던 의존성 주입 주석 해제

    // 1. 예약 페이지 로드
    @GetMapping("")
    public String reservationPage(Model model) {
        log.info("@# @# [GET] /reservation -> reservationPage() 호출");

        // 오늘 날짜 구하기
        String today = java.time.LocalDate.now().toString();
        model.addAttribute("today", today);

        // 충전기 목록 조회
        List<ChargerDto> chargerList = reservationService.getChargerList();
        model.addAttribute("chargerList", chargerList);

        log.info("@# 리턴할 뷰 경로: reservation/reservation");
        return "reservation/reservation";
    }

    // 2. 예약 생성 처리
    @PostMapping("/create")
    public String createReservation(ReservationDto reservationDto, 
                                    @AuthenticationPrincipal UserDetails userDetails, 
                                    Model model) {
    	// 로그인 여부 확인
    	if (userDetails == null) {
			return "redirect:/login";
		}
    	
        log.info("@# 로그인 유저 = {}", userDetails.getUsername());
        
        // login_id 기준으로 회원 조회
        UserDto user = userService.findByLoginId(userDetails.getUsername());

        // DTO에 user_id 세팅
        reservationDto.setUserId(user.getId());

        // 예약 생성
        reservationService.createReservation(reservationDto);

        // 생성된 예약 상세 조회
        ReservationDto reservation = reservationService.getReservationDetail(reservationDto.getId());

        // 화면 전달
        model.addAttribute("reservation", reservation);

        return "reservation/reservationSuccess";
    }
    
    // 3. 내 예약 목록 조회 (마이페이지용)
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

    // 4. 예약 단건 상세 조회
    @GetMapping("/{reservationId}")
    public String getReservationDetail(@PathVariable Long reservationId, 
                                       Model model, 
                                       @AuthenticationPrincipal UserDetails userDetails) {
    	// 로그인 여부 확인
    	if (userDetails == null) {
    		return "redirect:/login";
    	}
    	
    	log.info("@# [GET] /reservation/{} -> getReservationDetail() 호출", reservationId);

    	ReservationDto reservation = reservationService.getReservationDetail(reservationId);
    	log.info("@# 조회된 상세 데이터: {}", reservation);
    	
    	model.addAttribute("reservation", reservation);
    	log.info("@# 리턴할 뷰 경로: reservation/reservationDetail");
    	
        return "reservation/reservationDetail";
    }

    // 5. 특정 회원 기준 예약 리스트 반환 (필요시 관리자 페이지 등에서 활용)
    @GetMapping("/user/{userId}")
    @ResponseBody
    public List<ReservationDto> getReservationListByUser(@PathVariable Long userId) {
        return reservationService.getReservationListByUser(userId);
    }

    // 6. 충전 시작 처리
    @PostMapping("/start/{reservationId}")
    @ResponseBody
    public String startCharging(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/start/{} -> startCharging() 호출", reservationId);
        reservationService.startCharging(reservationId);
        return "충전 시작";
    }

    // 7. 충전 완료 처리
    @PostMapping("/complete/{reservationId}")
    @ResponseBody
    public String completeCharging(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/complete/{} -> completeCharging() 호출", reservationId);
        reservationService.completeCharging(reservationId);
        return "충전 완료";
    }

    // 8. 예약 취소 처리
    @PostMapping("/cancel/{reservationId}")
    @ResponseBody
    public String cancelReservation(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/cancel/{} -> cancelReservation() 호출", reservationId);
        reservationService.cancelReservation(reservationId);
        return "예약 취소 완료";
    }
    
    // 9. 충전기별 비활성화된 시간 Ajax 조회 (JSP의 fetch 연동용 API)
    @GetMapping("/reserved-times")
    @ResponseBody
    public List<ReservationDto> getReservedTimes(@RequestParam("chargerId") Long chargerId,
                                                 @RequestParam("date") String date) {

        log.info("@# @# [GET] /reservation/reserved-times 호출 -> chargerId: {}, date: {}", chargerId, date);

        try {
        	List<ReservationDto> reservedTimes = reservationService.getReservedTimes(chargerId, date);
            log.info("@# 조회된 예약 시간 개수: {}건", reservedTimes != null ? reservedTimes.size() : 0);
            return reservedTimes;
            
        } catch (Exception e) {
            log.error("@# [오류 발생] 예약 시간 조회 중 에러 발생: {}", e.getMessage(), e);
            return java.util.Collections.emptyList(); 
        }
    }
}