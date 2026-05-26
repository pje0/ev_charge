package com.boot.ev_charge.inquiry;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/admin/inquiry")
public class InquiryAdminController {

    @Autowired
    private InquiryService inquiryService;

    @Autowired
    private InquiryDAO inquiryDAO;

    /**
     * 1. 관리자 문의 대시보드 메인
     * 왼쪽 리스트에 뿌려줄 전체 방 목록을 조회합니다.
     */
    @GetMapping("/main")
    public String adminInquiryMain(HttpSession session, Model model) {
        // [테스트용] 관리자 세션 강제 주입
        session.setAttribute("adminId", 1L);
        session.setAttribute("userRole", "ADMIN");

        // 1:1 문의 전체 리스트 조회 (DAO의 selectAllRoomList 활용)
        List<InquiryRoomDTO> rooms = inquiryDAO.selectAllRoomList();
        model.addAttribute("rooms", rooms);

        return "admin/inquiry_main"; // 관리자용 메인 JSP
    }

    /**
     * 2. 특정 방의 채팅 내역 조회 (AJAX 호출용)
     * 리스트에서 유저 클릭 시 오른쪽 영역만 업데이트하기 위해 사용합니다.
     */
    @GetMapping("/detail")
    @ResponseBody
    public List<InquiryMessageDTO> getChatDetail(@RequestParam("roomId") Long roomId, HttpSession session) {
        // ADMIN 권한으로 조회 시 자동으로 읽음(isRead='Y') 처리됨 (Service 로직)
        return inquiryService.getChatHistory(roomId, "ADMIN");
    }

    /**
     * 3. 관리자 답장 전송 (AJAX 호출용)
     */
    @PostMapping("/reply")
    @ResponseBody
    public String replyMessage(@RequestParam("roomId") Long roomId, 
                               @RequestParam("content") String content, 
                               HttpSession session) {
        
        Long adminId = (Long) session.getAttribute("adminId");
        if (adminId == null) return "fail";

        inquiryService.replyFromAdmin(adminId, roomId, content);
        return "ok";
    }

    /**
     * 4. 문의 종료 처리
     */
    @PostMapping("/close")
    @ResponseBody
    public String closeInquiry(@RequestParam("roomId") Long roomId) {
        inquiryService.closeInquiry(roomId);
        return "ok";
    }
}