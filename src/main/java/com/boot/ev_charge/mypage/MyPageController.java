package com.boot.ev_charge.mypage;

import java.time.LocalDate;
import java.util.List;
import java.util.Map; 

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
import com.boot.ev_charge.vehicle.VehicleDto;     // 🌟 VehicleDto 임포트 추가
import com.boot.ev_charge.vehicle.VehicleService; // 🌟 VehicleService 임포트 추가
import com.boot.ev_charge.reservation.ReservationService; 

import lombok.extern.slf4j.Slf4j;

@Controller
@RequestMapping("/mypage")
@Slf4j 
public class MyPageController {

    @Autowired
    private MyPageService myPageService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ReservationService reservationService; 

    @Autowired
    private VehicleService vehicleService; // 🌟 차량 서비스 주입 추가

    // 1. 마이페이지 메인 
    @GetMapping("")
    public String myPageMain(@AuthenticationPrincipal UserDetails userDetails, 
                             @RequestParam(value = "tab", defaultValue = "upcoming") String tab, Model model) {
        
        if (userDetails == null) return "redirect:/login?loginRequired=true";

        UserDto currentUser = userService.findByLoginId(userDetails.getUsername());
        int userId = currentUser.getId().intValue();
        Long userIdLong = currentUser.getId(); 

        MyPageDto myPageDto = myPageService.getUserById(userId);

        try {
            Map<String, Object> stats = reservationService.getMypageStats(userIdLong);
            
            myPageDto.setTotalChargeCount(Integer.parseInt(String.valueOf(stats.get("totalChargeCount"))));
            myPageDto.setTotalChargeKw(Double.parseDouble(String.valueOf(stats.get("totalChargeKw"))));
            myPageDto.setSavedCarbon(Double.parseDouble(String.valueOf(stats.get("savedCarbon"))));
            
            log.info("📊 [Mypage] 통계 바인딩 완료 -> 횟수: {}회, 충전량: {}kWh", myPageDto.getTotalChargeCount(), myPageDto.getTotalChargeKw());
        } catch (Exception e) {
            log.error("❌ [Mypage] 통계 데이터를 불러오는 중 에러 발생: ", e);
            myPageDto.setTotalChargeCount(0);
            myPageDto.setTotalChargeKw(0.0);
            myPageDto.setSavedCarbon(0.0);
        }

        model.addAttribute("myPageDto", myPageDto);
        
        int upcomingCount = myPageService.getUpcomingReservations(userId).size();
        model.addAttribute("upcomingCount", upcomingCount);
        log.info("📌 [Mypage] 예정 예약 개수 로드 완료 -> {}건", upcomingCount);

        List<MyPageDto> reservationList = "past".equals(tab) ? 
                myPageService.getPastReservations(userId) : myPageService.getUpcomingReservations(userId);
        
        model.addAttribute("reservationList", reservationList);
        model.addAttribute("currentTab", tab);

        return "user/mypage";
    }

    // 2. 회원 정보 수정 처리
    @PostMapping("/update")
    public String updateUserInfo(@ModelAttribute MyPageDto myPageDto, RedirectAttributes ra) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String loginId = auth.getName(); 
        
        UserDto currentUser = userService.findByLoginId(loginId);
        myPageDto.setUserId(currentUser.getId().intValue());
        
        if (myPageService.updateUserInfo(myPageDto)) {
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

    // 3. 예약 취소 처리 
    @PostMapping("/reservation/cancel")
    public String cancelReservation(@RequestParam("reservationId") Long reservationId, RedirectAttributes ra) {
        if (myPageService.cancelReservation(reservationId)) {
            ra.addFlashAttribute("message", "예약이 취소(삭제)되었습니다.");
        } else {
            ra.addFlashAttribute("error", "예약 취소에 실패했습니다.");
        }
        return "redirect:/mypage";
    }
    
    // 4. 예약 수정 폼 로드 (배터리 정보 연동 픽스)
    @GetMapping("/reservation/edit")
    public String editReservationForm(@RequestParam("id") Long id, 
                                      Model model, 
                                      @AuthenticationPrincipal UserDetails userDetails) {
        // 기존 예약 정보 세팅
        MyPageDto reservation = myPageService.getReservationById(id);
        model.addAttribute("reservation", reservation);
        model.addAttribute("today", LocalDate.now().toString());

        // 🌟 [오류 해결] 에러가 났던 메서드 명을 getPrimaryVehicleByUserId 로 수정하여 매핑 성공!
        if (userDetails != null) {
            String loginId = userDetails.getUsername();
            UserDto currentUser = userService.findByLoginId(loginId);
            
            VehicleDto myCar = vehicleService.getPrimaryVehicleByUserId(currentUser.getId()); 
            model.addAttribute("myVehicle", myCar); 
        }

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