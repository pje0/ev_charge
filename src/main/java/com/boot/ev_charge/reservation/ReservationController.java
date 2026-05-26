package com.boot.ev_charge.reservation;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.propertyeditors.CustomNumberEditor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.station.StationDto;
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
    private UserService userService;

    // 1. 예약 페이지 로드 (충전소 목록 포함)
    @GetMapping("")
    public String reservationPage(Model model) {
        log.info("@# @# [GET] /reservation -> reservationPage() 호출");

        // 오늘 날짜 구하기
        String today = LocalDate.now().toString();
        model.addAttribute("today", today);

        // 충전소 목록 조회 (건너뛰기 기능을 위해 필수 추가)
        List<StationDto> stationList = reservationService.getStationList();
        model.addAttribute("stationList", stationList);

        log.info("@# 리턴할 뷰 경로: reservation/reservation");
        return "reservation/reservation";
    }

    // 2. 특정 충전소의 충전기 목록 조회 API
    @GetMapping("/api/chargers")
    @ResponseBody
    public List<ChargerDto> getChargers(@RequestParam("stationId") Long stationId) { // 🌟 @RequestParam("stationId") 로 이름 명시!
        log.info("@# [API] 충전기 목록 요청 stationId: {}", stationId);
        return reservationService.getChargersByStationId(stationId);
    }

    // 3. 예약 생성 처리
    @PostMapping("/create")
    public String createReservation(ReservationDto reservationDto, 
                                    @AuthenticationPrincipal UserDetails userDetails, 
                                    Model model) {
        if (userDetails == null) {
            return "redirect:/login";
        }
        
        log.info("@# 로그인 유저 = {}", userDetails.getUsername());
        
        UserDto user = userService.findByLoginId(userDetails.getUsername());
        reservationDto.setUserId(user.getId());

        reservationService.createReservation(reservationDto);
        ReservationDto reservation = reservationService.getReservationDetail(reservationDto.getId());

        model.addAttribute("reservation", reservation);

        return "reservation/reservationSuccess";
    }
    
    // 4. 내 예약 목록 조회 (마이페이지용)
    @GetMapping("/my")
    public String myReservation(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        log.info("@# [GET] /reservation/my -> myReservation() 호출");
        
        if (userDetails == null) {
            log.warn("@# [경고] 내 예약 목록 요청했으나 세션 없음");
            return "redirect:/login?loginRequired=true";
        }
        
        String loginId = userDetails.getUsername();
        UserDto user = userService.findByLoginId(loginId);
        
        List<ReservationDto> reservationList = reservationService.getReservationListByUser(user.getId());
        
        model.addAttribute("reservationList", reservationList);
        
        return "reservation/myReservation";
    }

    // 5. 예약 단건 상세 조회
    @GetMapping("/{reservationId}")
    public String getReservationDetail(@PathVariable Long reservationId, 
                                       Model model, 
                                       @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return "redirect:/login";
        }
        
        log.info("@# [GET] /reservation/{} -> getReservationDetail() 호출", reservationId);

        ReservationDto reservation = reservationService.getReservationDetail(reservationId);
        
        model.addAttribute("reservation", reservation);
        
        return "reservation/reservationDetail";
    }

    // 6. 특정 회원 기준 예약 리스트 반환
    @GetMapping("/user/{userId}")
    @ResponseBody
    public List<ReservationDto> getReservationListByUser(@PathVariable Long userId) {
        return reservationService.getReservationListByUser(userId);
    }

    // 7. 충전 시작 처리
    @PostMapping("/start/{reservationId}")
    @ResponseBody
    public String startCharging(@PathVariable Long reservationId) {
        log.info("@# [POST] /reservation/start/{} -> startCharging() 호출", reservationId);
        reservationService.startCharging(reservationId);
        return "충전 시작";
    }

    // 8. 충전 완료 처리
    @PostMapping("/complete/{reservationId}")
    @ResponseBody
    public String completeCharging(@PathVariable Long reservationId) {
        log.info("@# [POST] /reservation/complete/{} -> completeCharging() 호출", reservationId);
        reservationService.completeCharging(reservationId);
        return "충전 완료";
    }

    // 9. 예약 취소 처리
    @PostMapping("/cancel/{reservationId}")
    @ResponseBody
    public String cancelReservation(@PathVariable Long reservationId) {
        log.info("@# [POST] /reservation/cancel/{} -> cancelReservation() 호출", reservationId);
        reservationService.cancelReservation(reservationId);
        return "예약 취소 완료";
    }
    
    // 10. 충전기별 비활성화된 시간 Ajax 조회 (🌟 건너뛰기 공백 파라미터 제어 추가)
    @GetMapping("/reserved-times")
    @ResponseBody
    public List<ReservationDto> getReservedTimes(@RequestParam(value = "chargerId", required = false) Long chargerId,
                                                 @RequestParam("date") String date) {

        log.info("@# @# [GET] /reservation/reserved-times 호출 -> 원본 chargerId: {}, date: {}", chargerId, date);

        // 🌟 핵심: chargerId가 0이거나 미선택 상태로 들어오면 확실하게 null로 묶어줍니다.
        if (chargerId != null && chargerId == 0) {
            chargerId = null;
        }

        try {
            List<ReservationDto> reservedTimes = reservationService.getReservedTimes(chargerId, date);
            log.info("@# 최종 조회된 예약 시간 개수: {}건", reservedTimes != null ? reservedTimes.size() : 0);
            return reservedTimes;
            
        } catch (Exception e) {
            log.error("@# [오류 발생] 예약 시간 조회 중 에러 발생: {}", e.getMessage(), e);
            return java.util.Collections.emptyList(); 
        }
    }
    
    @InitBinder
    public void initBinder(WebDataBinder binder) {
        // 화면에서 chargerId가 비어있을 때 "" 문자열을 Long null로 안전하게 변환해 줍니다.
        binder.registerCustomEditor(Long.class, new CustomNumberEditor(Long.class, true));
    }
}