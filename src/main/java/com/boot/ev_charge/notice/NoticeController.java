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

    // [사용자] 공지사항 통합 목록 (검색 + 카테고리 + 페이징)
    @GetMapping("/notice/list")
    public String noticeList(NoticeCriteria cri, Model model) {
        
        // 1. 목록 데이터 가져오기 (검색/페이징 반영)
        List<NoticeDTO> list = noticeService.getNoticeList(cri);
        
        // 2. 전체 게시글 수 가져오기 (검색 조건 반영)
        int total = noticeService.getTotalCount(cri);
        
        // 3. 페이징 계산 (최적화 타협: 컨트롤러에서 직접 계산)
        int totalPages = (int) Math.ceil((double) total / cri.getLimit());
        
        // 4. JSP로 전송
        model.addAttribute("noticeList", list);
        model.addAttribute("total", total);
        model.addAttribute("totalPages", totalPages);
        model.addAttribute("cri", cri); // 현재 검색/페이지 상태 유지용
        
        return "notice/notice_list"; 
    }

    // [공통] 상세 데이터 (모달용)
    @GetMapping("/notice/detail/{id}")
    @ResponseBody 
    public NoticeDTO noticeDetail(@PathVariable(value = "id") Long id) {
        return noticeService.getNoticeDetail(id);
    }
}