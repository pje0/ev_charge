package com.boot.inquiry;

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
    
    @Autowired
    private InquiryDAO inquiryDAO;

    // 1:1 문의 채팅창 접속
    @GetMapping("/chat")
    public String myChatPage(HttpSession session, Model model) {
    	
        // [테스트용] 홍길동 유저(id: 2)로 세션 강제 주입
        session.setAttribute("userId", 2L); 
        session.setAttribute("userName", "홍길동");
        session.setAttribute("userRole", "USER");
    	
        Long userId = (Long) session.getAttribute("userId");
        if (userId == null) return "redirect:/login"; // 로그인 체크

        // 현재 유저의 열려있는 방 조회
        InquiryRoomDTO room = inquiryDAO.findOpenRoomByUserId(userId);
        
        if (room != null) {
            // 대화 내역 로드 (USER 권한으로 조회)
            List<InquiryMessageDTO> messages = inquiryService.getChatHistory(room.getId(), "USER");
            model.addAttribute("messages", messages);
            model.addAttribute("roomId", room.getId());
        }
        
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
}