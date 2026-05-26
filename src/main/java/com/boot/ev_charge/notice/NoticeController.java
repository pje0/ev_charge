package com.boot.ev_charge.notice;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    // ============================================================
    // [사용자] 공지사항 게시판 페이지 (누구나 접근)
    // 주소: http://localhost:8383/notice/list
    // ============================================================
    @GetMapping("/notice/list")
    public String noticeList(@RequestParam(value = "category", required = false, defaultValue = "전체") String category, Model model){
        List<NoticeDTO> list = noticeService.getNoticeList(category);
        model.addAttribute("noticeList", list);
        return "notice/notice_list"; 
    }

    // ============================================================
    // [공통] 공지사항 상세 데이터 (모달용 AJAX 전용)
    // 주소: http://localhost:8383/notice/detail/{id}
    // ============================================================
    @GetMapping("/notice/detail/{id}")
    @ResponseBody 
    public NoticeDTO noticeDetail(@PathVariable(value = "id") Long id) { // <- 여기 value 추가
        return noticeService.getNoticeDetail(id);
    }

    // ============================================================
    // [관리자] 대시보드 공지 관리 메인 (나중에 대시보드 탭 연동용)
    // 주소: http://localhost:8383/admin/notice/main
    // ============================================================
    @GetMapping("/admin/notice/main")
    public String adminNoticeMain(Model model) {
        List<NoticeDTO> list = noticeService.getNoticeList("전체");
        model.addAttribute("noticeList", list);
        return "notice/notice_list";
    }
}