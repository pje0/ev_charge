package com.boot.ev_charge.adminpage;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin")
public class AdminPageController {

    // 관리자 대시보드 메인 페이지 호출
    @GetMapping("/dashboard")
    public String adminDashboard() {
        // 리턴값은 prefix, suffix 설정을 제외한 JSP 파일의 경로입니다.
        // 예: /WEB-INF/views/admin/dashboard.jsp 라면 "admin/dashboard"
        return "admin/dashboard"; 
    }
}