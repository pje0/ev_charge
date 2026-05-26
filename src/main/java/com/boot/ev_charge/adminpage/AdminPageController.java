package com.boot.ev_charge.adminpage;

import com.boot.ev_charge.notice.NoticeCriteria;
import com.boot.ev_charge.notice.NoticeDTO;
import com.boot.ev_charge.notice.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import java.util.List;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor // NoticeService를 자동으로 가져옵니다.
public class AdminPageController {

    private final NoticeService noticeService; // 서비스 주입 필수!

    @GetMapping("/adminpage")
    public String adminDashboard(NoticeCriteria cri, Model model) {
        
        // 1. 페이징 초기값 세팅 (0개 조회를 방지)
        if(cri.getPage() <= 0) cri.setPage(1);
        if(cri.getLimit() <= 0) cri.setLimit(10);
        if(cri.getCategory() == null) cri.setCategory("전체");

        // 2. DB에서 공지사항 리스트 가져오기
        List<NoticeDTO> noticeList = noticeService.getNoticeList(cri);
        int total = noticeService.getTotalCount(cri);
        
        // 3. JSP에 데이터 전달 (이름 "noticeList" 확인!)
        model.addAttribute("noticeList", noticeList);
        model.addAttribute("cri", cri);
        model.addAttribute("totalPages", (int) Math.ceil((double) total / cri.getLimit()));

        // WEB-INF/views/admin/admin_main.jsp 호출
        return "admin/admin_main"; 
    }
}