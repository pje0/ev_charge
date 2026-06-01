package com.boot.ev_charge.reservation;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
    private ReservationMapper reservationMapper;
    
    @Autowired
    private UserService userService;

    // 1. 예약 페이지 로드 (충전소 목록 포함)
    @GetMapping("")
    public String reservationPage(
    		@RequestParam(value = "stationId", required = false) Long stationId,
            @RequestParam(value = "metro", required = false) String metro,
            @RequestParam(value = "city", required = false) String city,
            Model model) {
        log.info("@# @# [GET] /reservation -> reservationPage() 호출");

        String today = LocalDate.now().toString();
        model.addAttribute("today", today);

        Map<String, Object> emptyParams = new HashMap<>();
        List<StationDto> stationList = reservationService.getStationList(emptyParams);
        model.addAttribute("stationList", stationList);
        model.addAttribute("selectedStationId", stationId);
        model.addAttribute("selectedMetro", metro);
        model.addAttribute("selectedCity", city);
        
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
    @GetMapping("//mypage")
    public String myReservation(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        log.info("@# [GET] /reservation//mypage -> /mypage() 호출");
        
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
    public List<ReservationDto> getReservedTimes(
            @RequestParam(value = "chargerId", required = false) Long chargerId,
            @RequestParam(value = "stationId", required = false) Long stationId, // 🌟 충전소 ID 수신 파라미터 추가
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
            return reservationService.getReservedTimes(chargerId, stationId, date);
        } catch (Exception e) {
            log.error("@# [오류 발생] 예약 시간 조회 중 에러 발생: {}", e.getMessage(), e);
            return java.util.Collections.emptyList(); 
        }
    }
    
    // =====================================================
    // 🟢 예약 수정 페이지 이동 (마이페이지 -> 수정 페이지)
    // =====================================================
    @GetMapping("/mypage/reservation/edit")
    public String editReservationFromMyPage(@RequestParam("id") Long id, 
                                            Model model, 
                                            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return "redirect:/login";
        
        // 예약 상세 정보 조회
        ReservationDto res = reservationService.getReservationDetail(id);
        model.addAttribute("res", res);
        model.addAttribute("today", LocalDate.now().toString());
        
        // 🚨 파일 경로와 일치하게 뷰 이름을 반환하세요! 
        // 예: /WEB-INF/views/reservation/reservationEdit.jsp 라면 아래와 같이
        return "reservation/reservationEdit"; 
    }

    // =====================================================
    // 🟢 예약 수정 폼 제출 처리 (Fetch API 대응)
    // =====================================================
    @PostMapping("/update")
    @ResponseBody
    public String updateReservationAction(ReservationDto reservationDto, 
                                          @AuthenticationPrincipal UserDetails userDetails) {
        log.info("@# [POST] /reservation/update -> updateReservationAction() 가동");
        
        if (userDetails == null) {
            return "FAIL:LOGIN_REQUIRED";
        }

        try {
            // Service를 통해 데이터 덮어쓰기
            reservationService.updateReservation(reservationDto);
            return "SUCCESS";
        } catch (Exception e) {
            log.error("@# [예약 수정 에러] {}", e.getMessage());
            return "FAIL:ERROR";
        }
    }
    
 // =========================================================================
    // 🟢 1. 시/도 목록 제공 API
    // =========================================================================
    @GetMapping("/regions/sido")
    public ResponseEntity<List<String>> getSidoList() {
        log.info("🌐 [API Call] 클라이언트로부터 전체 시/도(metro) 목록 조회 요청이 인입되었습니다.");
        
        // Mapper를 통해 DB에서 시/도 리스트 추출
        List<String> sidoList = reservationMapper.getSidoList();
        
        log.info("✅ [API Response] DB 조회 완료. 총 {}개의 시/도 데이터를 프론트엔드로 반환합니다.", sidoList.size());
        return ResponseEntity.ok(sidoList); // HTTP 200 OK와 함께 JSON 데이터 반환
    }

    // =========================================================================
    // 🟢 2. 시/군/구 목록 제공 API (시/도 파라미터 필수)
    // =========================================================================
    @GetMapping("/regions/sigungu")
    public ResponseEntity<List<String>> getSigunguList(@RequestParam("metro") String metro) {
        log.info("🌐 [API Call] 클라이언트로부터 특정 시/도의 시/군/구 조회 요청 인입 -> 대상 시/도: {}", metro);
        
        // Mapper에 선택된 시/도 값을 넘겨 종속된 시/군/구 리스트 추출
        List<String> sigunguList = reservationMapper.getSigunguList(metro);
        
        log.info("✅ [API Response] DB 조회 완료. '{}' 지역 내 총 {}개의 시/군/구 데이터를 반환합니다.", metro, sigunguList.size());
        return ResponseEntity.ok(sigunguList); // HTTP 200 OK와 함께 JSON 데이터 반환
    }

    // =========================================================================
    // 🟢 3. 조건부 필터링 충전소 목록 제공 API
    // =========================================================================
    @GetMapping("/stations")
    public ResponseEntity<List<StationDto>> getFilteredStations(
            @RequestParam(value = "sido", required = false, defaultValue = "") String sido,
            @RequestParam(value = "sigungu", required = false, defaultValue = "") String sigungu,
            @RequestParam(value = "speed", required = false, defaultValue = "ALL") String speed) {
        
        log.info("🌐 [API Call] 충전소 목록 필터링 검색 요청 인입 -> 조건 [시/도: {}, 시/군/구: {}, 충전속도: {}]", sido, sigungu, speed);
        
        // MyBatis Mapper로 넘길 파라미터 Map 생성 및 데이터 바인딩
        Map<String, Object> filterParams = new HashMap<>();
        filterParams.put("metro", sido); // DB 컬럼명에 맞게 매핑
        filterParams.put("city", sigungu); // DB 컬럼명에 맞게 매핑
        filterParams.put("speed", speed); // RAPID, SLOW, ALL 속도 구분 매핑
        
        // 동적 쿼리가 적용된 Mapper 메서드 호출
        List<StationDto> stationList = reservationMapper.getStationList(filterParams);
        
        log.info("✅ [API Response] 필터링 DB 조회 완료. 총 {}개의 충전소 검색 결과를 프론트엔드로 반환합니다.", stationList.size());
        return ResponseEntity.ok(stationList); // HTTP 200 OK와 함께 JSON 데이터 반환
    }
}