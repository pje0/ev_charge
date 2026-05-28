package com.boot.ev_charge.notice;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller; 
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

@Controller //
@RequestMapping("/admin/notice")
@RequiredArgsConstructor
public class NoticeAdminController {

    private final NoticeService noticeService;

    // 1. [화면] 공지사항 작성 페이지 열기 (정상 작동)
    @GetMapping("/write")
    public ModelAndView noticeWriteForm() {
        ModelAndView mav = new ModelAndView();
        mav.setViewName("notice/notice_write"); 
        return mav;
    }

    // 2. [데이터] 공지사항 실제 저장
    @PostMapping("/write")
    @ResponseBody // 👈 중요: 데이터를 리턴하므로 추가!
    public boolean noticeWrite(@RequestBody NoticeDTO dto) {
        return noticeService.registerNotice(dto);
    }

    // 3-1. [화면] 공지사항 수정 페이지 열기 (404 해결 포인트!)
    @GetMapping("/edit/{id}")
    public ModelAndView noticeEditForm(@PathVariable(value = "id") Long id) {
        ModelAndView mav = new ModelAndView();
        
        NoticeDTO dto = noticeService.getNoticeDetail(id);
        mav.addObject("notice", dto);
        mav.setViewName("notice/notice_modify"); // notice_modify.jsp 호출
        return mav;
    }

    // 3-2. [데이터] 공지사항 수정 실행
    @PostMapping("/update")
    @ResponseBody //
    public boolean noticeUpdate(@RequestBody NoticeDTO dto) {
        return noticeService.modifyNotice(dto);
    }

    // 4. [데이터] 공지사항 삭제
    @GetMapping("/delete/{id}")
    @ResponseBody // 👈 중요: 데이터를 리턴하므로 추가!
    public boolean noticeDelete(@PathVariable(value = "id") Long id) {
        return noticeService.removeNotice(id);
    }
}