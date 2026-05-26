package com.boot.ev_charge.notice;

import java.util.List;

public interface NoticeService {
    // 목록 및 상세
    List<NoticeDTO> getNoticeList(String category);
    NoticeDTO getNoticeDetail(Long id);

    // 관리자 기능
    boolean registerNotice(NoticeDTO noticeDTO);
    boolean modifyNotice(NoticeDTO noticeDTO);
    boolean removeNotice(Long id);
}