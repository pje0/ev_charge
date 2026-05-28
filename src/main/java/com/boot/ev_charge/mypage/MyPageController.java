package com.boot.ev_charge.mypage;

import java.util.List;

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

@Controller
@RequestMapping("/mypage")
public class MyPageController {

    @Autowired
    private MyPageService myPageService;
    @Autowired
    private UserService userService;

    // 1. 마이페이지 메인 (회원정보 + 예약 목록 조회)
    @GetMapping("")
    public String myPageMain(@AuthenticationPrincipal UserDetails userDetails, 
                             @RequestParam(value = "tab", defaultValue = "upcoming") String tab, Model model) {
        if (userDetails == null) return "redirect:/login?loginRequired=true";

        UserDto currentUser = userService.findByLoginId(userDetails.getUsername());
        int userId = currentUser.getId().intValue();

        model.addAttribute("myPageDto", myPageService.getUserById(userId));

        List<MyPageDto> reservationList = "past".equals(tab) ? 
                myPageService.getPastReservations(userId) : myPageService.getUpcomingReservations(userId);
        
        model.addAttribute("reservationList", reservationList);
        model.addAttribute("currentTab", tab);

        return "user/mypage";
    }

    // 2. 회원 정보 수정 처리
 // 💡 MyPageController 내부의 updateUserInfo 메서드를 이 방식으로 덮어쓰기 해보세요.
    @PostMapping("/update")
    public String updateUserInfo(@ModelAttribute MyPageDto myPageDto, RedirectAttributes ra) {
        
        // 파라미터 주입 대신, 시큐리티 컨텍스트에서 직접 로그인 아이디를 꺼내오는 가장 확실한 방법
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String loginId = auth.getName(); // 현재 로그인한 유저의 아이디 (예: admin)
        
        // 유저 아이디 기반으로 DB에서 식별자(PK)를 조회하여 주입
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

    // 🌟 3. 예약 취소 처리 (Delete 동작)
    @PostMapping("/reservation/cancel")
    public String cancelReservation(@RequestParam("reservationId") Long reservationId, RedirectAttributes ra) {
        if (myPageService.cancelReservation(reservationId)) {
            ra.addFlashAttribute("message", "예약이 취소(삭제)되었습니다.");
        } else {
            ra.addFlashAttribute("error", "예약 취소에 실패했습니다.");
        }
        return "redirect:/mypage";
    }

	 // MyPageController.java 추가 메서드
	
	 // 1. 예약 수정 폼 로드
	 @GetMapping("/reservation/edit")
	 public String editReservationForm(@RequestParam("id") Long id, Model model) {
	     // DB에서 해당 예약 상세 정보 조회 후 model에 담기
	     MyPageDto reservation = myPageService.getReservationById(id);
	     model.addAttribute("reservation", reservation);
	     return "reservation/reservationEdit";
	 }
	
	 // 2. 예약 수정 처리
	 @PostMapping("/reservation/modify")
	 public String modifyReservation(@ModelAttribute MyPageDto dto, RedirectAttributes ra) {
	     if (myPageService.modifyReservation(dto)) {
	         ra.addFlashAttribute("message", "예약이 성공적으로 수정되었습니다.");
	     } else {
	         ra.addFlashAttribute("error", "수정 중 오류가 발생했습니다.");
	     }
	     return "redirect:/mypage";
	 }
    
    @GetMapping("/edit")
    public String editProfileForm(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        // 세션에서 현재 로그인된 유저 ID를 얻어와 정보 조회 후 모델에 담기
        String loginId = userDetails.getUsername();
        UserDto currentUser = userService.findByLoginId(loginId);
        
        MyPageDto myPageDto = myPageService.getUserById(currentUser.getId().intValue());
        model.addAttribute("myPageDto", myPageDto);
        
        return "user/mypage-edit"; // 위에서 만든 jsp 파일 경로
    }
}