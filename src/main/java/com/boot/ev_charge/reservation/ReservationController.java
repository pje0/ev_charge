package com.boot.ev_charge.reservation;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.station.StationDto;
import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequestMapping("/reservation")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;
    
    @Autowired
    private UserService userService;

    // =========================================================================
    // 🚨 [v1.5 패치] 동시성 예약 충돌 핸들러 (Whitelabel Error Page 영구 추방)
    // =========================================================================
    @ExceptionHandler(RuntimeException.class)
    public void handleReservationConflict(RuntimeException ex, HttpServletResponse response) throws IOException {
        // 서비스 단에서 터진 예외 메시지에 "이미 예약된 시간" 마커가 감지되면 낚아챕니다.
        if (ex.getMessage() != null && ex.getMessage().contains("이미 예약된 시간")) {
            log.warn("⚠️ [동시성 예약 충돌 발생] 브라우저 알럿 래핑 가드 가동 -> 이유: {}", ex.getMessage());
            
            // 응답 스트림 한글 깨짐 방지 및 HTML 헤더 강제 빌드
            response.setContentType("text/html; charset=UTF-8");
            PrintWriter out = response.getWriter();
            
            // 브라우저 화면에 에러 페이지 대신 팝업 유도 및 예약 메인 렌더링 리셋 리다이렉트
            out.println("<script>");
            out.println("    alert('죄송합니다. 다른 사용자가 먼저 해당 시간대 예약을 완료했습니다.\\n처음부터 다시 진행해 주세요.');");
            out.println("    location.href = '/reservation';"); 
            out.println("</script>");
            out.flush();
            out.close();
            return;
        }
        
        // 예약 충전 충돌 외의 런타임 예외는 기본 스프링 예외 스택으로 그대로 패스합니다.
        throw ex;
    }

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

    // 2. 특정 충전소의 충전기 목록 조회 API (v1.8 date 파라미터 통합)
    @GetMapping("/api/chargers")
    @ResponseBody
    public List<ChargerDto> getChargers(
            @RequestParam("stationId") Long stationId,
            @RequestParam(value = "date", required = false) String date) { 
        
        log.info("@# [API] 충전기 목록 요청 stationId: {}, date: {}", stationId, date);
        
        // 브라우저에서 날짜가 넘어오지 않은 경우 방어 코드로 오늘 날짜 기본 세팅
        if (date == null || date.isEmpty()) {
            date = LocalDate.now().toString();
        }
        
        // 서비스 호출 시 stationId와 date를 함께 전달합니다.
        return reservationService.getChargersByStationId(stationId, date);
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
    @GetMapping("/mypage")
    public String myReservation(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        log.info("@# [GET] /user/mypage -> mypage() 호출");
        
        if (userDetails == null) {
            log.warn("@# [경고] 내 예약 목록 요청했으나 세션 없음");
            return "redirect:/login?loginRequired=true";
        }
        
        String loginId = userDetails.getUsername();
        UserDto user = userService.findByLoginId(loginId);
        
        List<ReservationDto> reservationList = reservationService.getReservationListByUser(user.getId());
        
        model.addAttribute("reservationList", reservationList);
        
        return "/mypage";
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
    
    // 10. 충전기별 비활성화된 시간 Ajax 조회
    @GetMapping("/reserved-times")
    @ResponseBody
    public List<ReservationDto> getReservedTimes(
            @RequestParam(value = "chargerId", required = false) Long chargerId,
            @RequestParam(value = "stationId", required = false) Long stationId, 
            @RequestParam("date") String date,
            @RequestParam(value = "targetPercent", required = false) Integer targetPercent) {

        if (chargerId != null && chargerId == 0) chargerId = null;
        if (stationId != null && stationId == 0) stationId = null;

        log.info("@# [GET] /reservation/reserved-times 통합 메서드 가동 -> chargerId: {}, date: {}, targetPercent: {}", 
                chargerId, date, targetPercent);
        
        double chargerKw = 50.0; 
        int requiredMinutes = 0;
        if (targetPercent != null && targetPercent > 0) {
            requiredMinutes = reservationService.calculateRequiredMinutes(targetPercent, chargerKw);
            log.info("@# TARGET 연산 작동 -> 예상 소요 시간: {}분", requiredMinutes);
        }

        try {
            List<ReservationDto> reservedTimes = reservationService.getReservedTimes(chargerId, stationId, date);
            return reservedTimes;
        } catch (Exception e) {
            log.error("@# [오류 발생] 예약 시간 조회 중 에러 발생: {}", e.getMessage(), e);
            return java.util.Collections.emptyList(); 
        }
    }
}