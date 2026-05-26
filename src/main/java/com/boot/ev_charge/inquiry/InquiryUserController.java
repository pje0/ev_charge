package com.boot.ev_charge.inquiry;

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
    
    // getOrCreateRoom 호출을 위해 서비스만 사용하도록 변경 (DAO 직접 호출 제거)

    // 1:1 문의 채팅창 접속
    @GetMapping("/chat")
    public String myChatPage(HttpSession session, Model model) {
    	
        // [테스트용] 홍길동 유저(id: 2)로 세션 강제 주입
        session.setAttribute("userId", 2L); 
        session.setAttribute("userName", "홍길동");
        session.setAttribute("userRole", "USER");
    	
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return "redirect:/login"; // 로그인 체크

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
    public String sendMessage(@RequestParam("content") String content, HttpSession session) {
    	
        // [테스트용] 전송 시에도 세션이 없을 경우를 대비해 주입
        if(session.getAttribute("userId") == null) {
            session.setAttribute("userId", 2L);
        }
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return "fail";

        inquiryService.sendMessageFromUser(userId, content);
        return "ok";
    }

    // 채팅 내역만 가져오는 API (폴링용)
    @GetMapping("/messages")
    @ResponseBody
    public List<InquiryMessageDTO> getMessages(@RequestParam("roomId") Long roomId, HttpSession session) {
        // 세션에서 현재 유저 권한 확인 (읽음 처리 로직 때문)
        String userRole = (String) session.getAttribute("userRole");
        
        // DB에서 해당 방의 전체 메시지 리스트 반환
        return inquiryService.getChatHistory(roomId);
    }
}