package com.boot.ev_charge.adminpage;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boot.ev_charge.dashboard.DashboardDTO;
import com.boot.ev_charge.dashboard.DashboardService;
import com.boot.ev_charge.notice.NoticeCriteria;
import com.boot.ev_charge.notice.NoticeDTO;
import com.boot.ev_charge.notice.NoticeService;
import com.boot.ev_charge.reservation.ReservationDto;
import com.boot.ev_charge.reservation.ReservationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminPageController {

    private final NoticeService noticeService; // 서비스 주입 필수!
    private final ReservationService reservationService; // 예약 서비스 주입 추가
    private final DashboardService dashboardService;

    @GetMapping("/adminpage")
    public String adminDashboard(
            NoticeCriteria cri, 
            @RequestParam(value = "searchStatus", required = false) String searchStatus,
            @RequestParam(value = "searchType", required = false) String searchType,
            @RequestParam(value = "searchKeyword", required = false) String searchKeyword,
            Model model) {
        
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

        // [추가] 회원 예약 관리 리스트 조회 및 검색 조건 전달
        log.info("@# [GET] /admin/adminpage -> adminDashboard() 예약 필터 검색 가동 [상태: {}, 타입: {}, 키워드: {}]", searchStatus, searchType, searchKeyword);
        List<ReservationDto> reservationList = reservationService.getAdminReservationList(searchStatus, searchType, searchKeyword);
        model.addAttribute("reservationList", reservationList);
        model.addAttribute("searchStatus", searchStatus);
        model.addAttribute("searchType", searchType);
        model.addAttribute("searchKeyword", searchKeyword);
     // [추가] 관리자 Dashboard 요약 정보 전달
        model.addAttribute("dashboard", dashboardService.getDashboardSummary());

        // WEB-INF/views/admin/admin_main.jsp 호출
        return "admin/admin_main"; 
    }
    
    

    // [추가] 관리자 예약 즉시 삭제 API
    @PostMapping("/reservation/delete")
    @ResponseBody
    public Map<String, Object> deleteReservation(@RequestParam("id") Long reservationId) {
        log.info("@# [POST] /admin/reservation/delete -> deleteReservation() 호출 [삭제할 예약 ID: {}]", reservationId);
        Map<String, Object> resultMap = new HashMap<>();
        try {
            boolean isDeleted = reservationService.deleteAdminReservation(reservationId);
            if (isDeleted) {
                log.info("@# [삭제 성공] 예약 ID: {} 데이터가 성공적으로 제거되었습니다.", reservationId);
                resultMap.put("result", "success");
            } else {
                log.warn("@# [삭제 실패] 예약 ID: {} 데이터를 찾을 수 없거나 이미 삭제되었습니다.", reservationId);
                resultMap.put("result", "fail");
                resultMap.put("message", "존재하지 않는 예약 번호입니다.");
            }
        } catch (Exception e) {
            log.error("@# [오류 발생] 예약 ID: {} 삭제 중 서버 에러: {}", reservationId, e.getMessage(), e);
            resultMap.put("result", "error");
            resultMap.put("message", "데이터베이스 삭제 처리 중 오류가 발생했습니다.");
        }
        return resultMap;
    }
 // [추가] Dashboard 실시간 요약 조회 API
    @GetMapping("/dashboard/summary")
    @ResponseBody
    public DashboardDTO getDashboardSummary() {

        log.info("@# [GET] /admin/dashboard/summary -> Dashboard polling");

        return dashboardService.getDashboardSummary();
    }
}