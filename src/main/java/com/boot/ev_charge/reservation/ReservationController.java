package com.boot.ev_charge.reservation;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
<<<<<<< feature/조성민
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
=======
import org.springframework.web.bind.annotation.RestController;
>>>>>>> 5a22b00 도중 저장

<<<<<<< feature/조성민
import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
=======
@RestController
>>>>>>> 5a22b00 도중 저장
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

<<<<<<< feature/조성민
    // 예약 페이지
    @GetMapping("")
    public String reservationPage(Model model) {

        log.info("@# @# [GET] /reservation -> reservationPage() 호출");

        // 오늘 날짜
        String today = java.time.LocalDate.now().toString();

        model.addAttribute("today", today);

        // 충전기 목록 조회
        List<ChargerDto> chargerList = reservationService.getChargerList();

        model.addAttribute("chargerList", chargerList);

        log.info("@# 리턴할 뷰 경로: reservation/reservation");

        return "reservation/reservation";
    }
=======
>>>>>>> 5a22b00 도중 저장

    // 예약 생성
    @PostMapping("/create")
<<<<<<< feature/조성민
    public String createReservation(ReservationDto reservationDto, @AuthenticationPrincipal UserDetails userDetails, Model model) {
=======
    public String createReservation(@RequestBody ReservationDto dto) {
>>>>>>> 5a22b00 도중 저장

<<<<<<< feature/조성민
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
        ReservationDto reservation =
        		reservationService.getReservationDetail(reservationDto.getId());

        // 화면 전달
        model.addAttribute("reservation", reservation);

        return "reservation/reservationSuccess";
=======
        reservationService.createReservation(dto);

        return "예약 완료";
>>>>>>> 5a22b00 도중 저장
    }
<<<<<<< feature/조성민
    
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
=======

>>>>>>> 5a22b00 도중 저장

    // 예약 상세 조회
    @GetMapping("/{reservationId}")
<<<<<<< feature/조성민
    public String getReservationDetail(@PathVariable Long reservationId, Model model, @AuthenticationPrincipal UserDetails userDetails) {
    	
    	// 로그인 여부 확인
    	if (userDetails == null) {
    		return "redirect:/login";
    	}
    	
    	log.info("@# [GET] /reservation/{} -> getReservationDetail() 호출", reservationId);
=======
    public ReservationDto getReservationDetail(
            @PathVariable Long reservationId) {
>>>>>>> 5a22b00 도중 저장

<<<<<<< feature/조성민
    	ReservationDto reservation = reservationService.getReservationDetail(reservationId);
    	log.info("@# 조회된 상세 데이터: {}", reservation);
    	
    	model.addAttribute("reservation", reservation);
    	log.info("@# 리턴할 뷰 경로: reservation/reservationDetail");
    	
        return "reservation/reservationDetail";
=======
        return reservationService.getReservationDetail(reservationId);
>>>>>>> 5a22b00 도중 저장
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
    	log.info("@# [POST] /reservation/start/{} -> startCharging() 호출", reservationId);

        reservationService.startCharging(reservationId);
        log.info("@# 충전 시작 상태 변경 완료 -> 목록으로 리다이렉트");

        return "충전 시작";
    }


    // 충전 완료
    @PostMapping("/complete/{reservationId}")
    public String completeCharging(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/complete/{} -> completeCharging() 호출", reservationId);

        reservationService.completeCharging(reservationId);
        log.info("@# 충전 완료 상태 변경 완료 -> 목록으로 리다이렉트");

        return "충전 완료";
    }


    // 예약 취소
    @PostMapping("/cancel/{reservationId}")
    public String cancelReservation(@PathVariable Long reservationId) {
    	log.info("@# [POST] /reservation/cancel/{} -> cancelReservation() 호출", reservationId);

        reservationService.cancelReservation(reservationId);
        log.info("@# 예약 취소 완료 -> 목록으로 리다이렉트");

        return "예약 취소 완료";
    }
    
    @GetMapping("/reserved-times")
    @ResponseBody
    public List<ReservationDto> getReservedTimes(
            @RequestParam("chargerId") Long chargerId,
            @RequestParam("date") String date) {

        log.info("@# @# [GET] /reservation/reserved-times 호출 -> chargerId: {}, date: {}", chargerId, date);

        try {
            // 서비스 레이어 호출
        	List<ReservationDto> reservedTimes = reservationService.getReservedTimes(chargerId, date);
            log.info("@# 조회된 예약 시간 개수: {}건", reservedTimes != null ? reservedTimes.size() : 0);
            
            return reservedTimes;
            
        } catch (Exception e) {
            // 🔥 이 로그가 STS 콘솔에 에러의 진짜 원인(NPE, SQL 구문 오류 등)을 출력해 줍니다.
            log.error("@# [오류 발생] 예약 시간 조회 중 에러 발생: {}", e.getMessage(), e);
            
            // 서버 오류로 아예 뻗어버리는(500) 현상을 방지하기 위해 안전하게 빈 리스트 반환
            return java.util.Collections.emptyList(); 
        }
    }
}