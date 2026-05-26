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
     */
    @GetMapping("/main")
    public String adminInquiryMain(HttpSession session, Model model) {
        session.setAttribute("adminId", 1L);
        session.setAttribute("userRole", "ADMIN");

        List<InquiryRoomDTO> rooms = inquiryDAO.selectAllRoomList();
        model.addAttribute("rooms", rooms);

        return "admin/inquiry_main";
    }

    /**
     * 2. 특정 방의 채팅 내역 조회 (AJAX 호출용)
     * 이제 이 메서드는 단순 조회만 수행하며, 폴링 시에도 안전합니다.
     */
    @GetMapping("/detail")
    @ResponseBody
    public List<InquiryMessageDTO> getChatDetail(@RequestParam("roomId") Long roomId) {
        return inquiryService.getChatHistory(roomId);
    }

    /**
     * 3. 읽음 처리 전용 API (추가)
     * 관리자가 방을 클릭하는 시점에만 호출됩니다.
     */
    @PostMapping("/markRead")
    @ResponseBody
    public String markRead(@RequestParam("roomId") Long roomId) {
        inquiryService.markAsRead(roomId);
        return "ok";
    }

    /**
     * 4. 관리자 답장 전송
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
     * 5. 문의 종료 처리
     */
    @PostMapping("/close")
    @ResponseBody
    public String closeInquiry(@RequestParam("roomId") Long roomId) {
        inquiryService.closeInquiry(roomId);
        return "ok";
    }

    /**
     * 6. 왼쪽 리스트 실시간 데이터 조회
     */
    @GetMapping("/listData")
    @ResponseBody
    public List<InquiryRoomDTO> getRoomListData() {
        return inquiryDAO.selectAllRoomList();
    }
}