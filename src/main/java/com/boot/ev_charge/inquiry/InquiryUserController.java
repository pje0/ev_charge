package com.boot.ev_charge.inquiry;

import com.boot.ev_charge.user.UserService;
import com.boot.ev_charge.user.UserDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/user/inquiry")
public class InquiryUserController {

    @Autowired
    private InquiryService inquiryService;
    
    // 유저 정보를 안전하게 조회하기 위해 기존 머지된 서비스를 주입합니다.
    @Autowired
    private UserService userService;
    
    // getOrCreateRoom 호출을 위해 서비스만 사용하도록 변경 (DAO 직접 호출 제거)

    // 1:1 문의 채팅창 접속
    @GetMapping("/chat")
    public String myChatPage(@AuthenticationPrincipal UserDetails userDetails, HttpSession session, Model model) {
    	
        // 비로그인 시 메인 페이지("/")로 리다이렉트
        if (userDetails == null) return "redirect:/"; 
    	
        // 시큐리티 인증 객체에서 문자열 아이디를 꺼낸 후, 기존 테이블 매퍼를 통해 진짜 고유 ID를 가져옵니다.
        String loginId = userDetails.getUsername();
        UserDto user = userService.findByLoginId(loginId);
        Long userId = user.getId();

        // [수정] 현재 유저의 열려있는 방 조회 (없으면 서비스에서 자동 생성)
        // 기존의 if(room != null) 체크 로직을 서비스 내부로 옮겨 방 생성을 보장합니다.
        InquiryRoomDTO room = inquiryService.getOrCreateRoom(userId);
        
        // 대화 내역 로드 (USER 권한으로 조회)
        List<InquiryMessageDTO> messages = inquiryService.getChatHistory(room.getId());
        
        model.addAttribute("messages", messages);
        model.addAttribute("roomId", room.getId());
        
        // 이미지 확인 경로: /WEB-INF/views/inquiry/user_inquiry.jsp
        return "inquiry/user_inquiry";
    }

    // 메시지 전송 (AJAX 전용)
    @PostMapping("/send")
    @ResponseBody
    // @RequestParam 뒤에 ("content")를 추가했습니다.
    public String sendMessage(@RequestParam("content") String content, @AuthenticationPrincipal UserDetails userDetails, HttpSession session) {
    	
        if (userDetails == null) return "fail";
        
        // 시큐리티 인증 객체에서 문자열 아이디를 꺼낸 후, 기존 테이블 매퍼를 통해 진짜 고유 ID를 가져옵니다.
        String loginId = userDetails.getUsername();
        UserDto user = userService.findByLoginId(loginId);
        Long userId = user.getId();

        inquiryService.sendMessageFromUser(userId, content);
        return "ok";
    }

    // 채팅 내역만 가져오는 API (폴링용)
    @GetMapping("/messages")
    @ResponseBody
    public List<InquiryMessageDTO> getMessages(@RequestParam("roomId") Long roomId, @AuthenticationPrincipal UserDetails userDetails, HttpSession session) {
        // 세션에서 현재 유저 권한 확인 (읽음 처리 로직 때문)
        // 세션 대신 시큐리티 정보가 있으면 가져오고, 테스트 환경을 위해 세션 백업도 유지합니다.
        String userRole = (userDetails != null) ? userDetails.getAuthorities().toString() : (String) session.getAttribute("userRole");
        
        System.out.println("현재 접속한 유저 권한: " + userRole);
        
        // DB에서 해당 방의 전체 메시지 리스트 반환
        return inquiryService.getChatHistory(roomId);
    }
}