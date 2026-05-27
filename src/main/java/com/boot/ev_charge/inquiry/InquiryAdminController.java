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
@RequestMapping("/admin/inquiry")
public class InquiryAdminController {

    @Autowired
    private InquiryService inquiryService;

    @Autowired
    private InquiryMapper inquiryDAO;

    // 유저 정보를 안전하게 조회하기 위해 기존 머지된 서비스를 주입합니다.
    @Autowired
    private UserService userService;

    /**
     * 1. 관리자 문의 대시보드 메인
     */
    @GetMapping("/chat")
    public String adminInquiryMain(@AuthenticationPrincipal UserDetails userDetails, HttpSession session, Model model) {
        // 비로그인 시 메인 페이지("/")로 리다이렉트
        if (userDetails == null) return "redirect:/";

        List<InquiryRoomDTO> rooms = inquiryDAO.selectAllRoomList();
        model.addAttribute("rooms", rooms);

        return "admin/admin_inquiry";
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
                               @AuthenticationPrincipal UserDetails userDetails,
                               HttpSession session) {
        if (userDetails == null) return "fail";

        // 시큐리티 인증 객체에서 문자열 아이디를 꺼낸 후, 기존 테이블 매퍼를 통해 진짜 고유 ID를 가져옵니다.
        String loginId = userDetails.getUsername();
        UserDto user = userService.findByLoginId(loginId);
        Long adminId = user.getId();

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