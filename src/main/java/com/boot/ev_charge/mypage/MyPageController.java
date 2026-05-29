package com.boot.ev_charge.mypage;

import java.util.List;
import java.util.Map; // 🟢 통계 데이터를 받기 위한 Map 임포트 추가

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;
import com.boot.ev_charge.reservation.ReservationService; // 🟢 통계 조회를 위한 예약 서비스 임포트

import lombok.extern.slf4j.Slf4j;

@Controller
@RequestMapping("/mypage")
@Slf4j // 콘솔에 로그를 찍기 위해 추가
public class MyPageController {

    @Autowired
    private MyPageService myPageService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ReservationService reservationService; // 🟢 실시간 통계 연산을 위해 추가 주입

    // 1. 마이페이지 메인 (회원정보 + 통계 + 예약/차량 목록 조회)
    @GetMapping("")
    public String myPageMain(@AuthenticationPrincipal UserDetails userDetails, 
                             @RequestParam(value = "tab", defaultValue = "upcoming") String tab, Model model) {
        
        if (userDetails == null) return "redirect:/login?loginRequired=true";

        UserDto currentUser = userService.findByLoginId(userDetails.getUsername());
        int userId = currentUser.getId().intValue();
        Long userIdLong = currentUser.getId(); // ReservationService는 Long 타입을 쓰므로 변환

        // [1] DB에서 유저 기본 정보(이름, 이메일, 가입일 등)를 가져와 DTO에 세팅
        MyPageDto myPageDto = myPageService.getUserById(userId);

        // ====================================================================
        // 🟢 [2] 실시간 충전 통계 연산 및 DTO 주입 로직 추가 구역
        // ====================================================================
        try {
            Map<String, Object> stats = reservationService.getMypageStats(userIdLong);
            
            // Map에서 값을 꺼내 myPageDto에 세팅 (Null 방지 및 타입 캐스팅)
            myPageDto.setTotalChargeCount(Integer.parseInt(String.valueOf(stats.get("totalChargeCount"))));
            myPageDto.setTotalChargeKw(Double.parseDouble(String.valueOf(stats.get("totalChargeKw"))));
            myPageDto.setSavedCarbon(Double.parseDouble(String.valueOf(stats.get("savedCarbon"))));
            
            log.info("📊 [Mypage] 통계 바인딩 완료 -> 횟수: {}회, 충전량: {}kWh", myPageDto.getTotalChargeCount(), myPageDto.getTotalChargeKw());
        } catch (Exception e) {
            log.error("❌ [Mypage] 통계 데이터를 불러오는 중 에러 발생: ", e);
            // 에러 발생 시 기본값 0으로 세팅하여 화면이 깨지는 것을 방지
            myPageDto.setTotalChargeCount(0);
            myPageDto.setTotalChargeKw(0.0);
            myPageDto.setSavedCarbon(0.0);
        }
        // ====================================================================

        // [3] 완성된 DTO를 Model에 담아 화면으로 전달
        model.addAttribute("myPageDto", myPageDto);
        
        // ====================================================================
        // 🟢 [추가] 탭 상태와 무관하게 '예정 예약' 개수는 항상 조회하여 뱃지에 출력합니다.
        // ====================================================================
        int upcomingCount = myPageService.getUpcomingReservations(userId).size();
        model.addAttribute("upcomingCount", upcomingCount);
        log.info("📌 [Mypage] 예정 예약 개수 로드 완료 -> {}건", upcomingCount);
        // ====================================================================

        // [4] 탭 조건에 따른 예약 리스트 조회 (차량 관리 탭일 때는 굳이 안 불러와도 되지만 폼 유지를 위해 놔둡니다)
        List<MyPageDto> reservationList = "past".equals(tab) ? 
                myPageService.getPastReservations(userId) : myPageService.getUpcomingReservations(userId);
        
        model.addAttribute("reservationList", reservationList);
        model.addAttribute("currentTab", tab);

        return "user/mypage";
    }

    // 2. 회원 정보 수정 처리
    @PostMapping("/update")
    public String updateUserInfo(@ModelAttribute MyPageDto myPageDto, RedirectAttributes ra) {
        
        // 파라미터 주입 대신, 시큐리티 컨텍스트에서 직접 로그인 아이디를 꺼내오는 가장 확실한 방법
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String loginId = auth.getName(); 
        
        UserDto currentUser = userService.findByLoginId(loginId);
        myPageDto.setUserId(currentUser.getId().intValue());
        
        if (myPageService.updateUserInfo(myPageDto)) {
            // 수정 성공 시 세션 갱신
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken newAuth = 
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                    auth.getPrincipal(), 
                    myPageDto.getPassword() != null ? myPageDto.getPassword() : auth.getCredentials(), 
                    auth.getAuthorities()
                );
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(newAuth);
            
            ra.addFlashAttribute("message", "회원 정보가 수정되었습니다.");
        } else {
            ra.addFlashAttribute("error", "비밀번호 검증에 실패했습니다.");
        }
        return "redirect:/mypage";
    }

    // 3. 예약 취소 처리 (Delete 동작)
    @PostMapping("/reservation/cancel")
    public String cancelReservation(@RequestParam("reservationId") Long reservationId, RedirectAttributes ra) {
        if (myPageService.cancelReservation(reservationId)) {
            ra.addFlashAttribute("message", "예약이 취소(삭제)되었습니다.");
        } else {
            ra.addFlashAttribute("error", "예약 취소에 실패했습니다.");
        }
        return "redirect:/mypage";
    }
    
    // 4. 예약 수정 폼 로드
    @GetMapping("/reservation/edit")
    public String editReservationForm(@RequestParam("id") Long id, Model model) {
        MyPageDto reservation = myPageService.getReservationById(id);
        model.addAttribute("reservation", reservation);
        return "reservation/reservationEdit";
    }
    
    // 5. 예약 수정 처리
    @PostMapping("/reservation/modify")
    public String modifyReservation(@ModelAttribute MyPageDto dto, RedirectAttributes ra) {
        if (myPageService.modifyReservation(dto)) {
            ra.addFlashAttribute("message", "예약이 성공적으로 수정되었습니다.");
        } else {
            ra.addFlashAttribute("error", "수정 중 오류가 발생했습니다.");
        }
        return "redirect:/mypage";
    }
    
    // 6. 회원정보 수정 페이지 이동
    @GetMapping("/edit")
    public String editProfileForm(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        String loginId = userDetails.getUsername();
        UserDto currentUser = userService.findByLoginId(loginId);
        
        MyPageDto myPageDto = myPageService.getUserById(currentUser.getId().intValue());
        model.addAttribute("myPageDto", myPageDto);
        
        return "user/mypageEdit"; 
    }
}