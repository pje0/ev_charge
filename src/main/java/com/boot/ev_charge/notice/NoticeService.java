package com.boot.ev_charge.notice;

import java.util.List;

public interface NoticeService {
    // 1. [통합] 공지 목록 조회 (검색 + 페이징 포함)
    List<NoticeDTO> getNoticeList(NoticeCriteria cri);
    // 2. [통합] 공지 총 개수 조회 (페이징 계산용)
    int getTotalCount(NoticeCriteria cri);
    // 3. 상세 조회 (조회수 증가 포함)
    NoticeDTO getNoticeDetail(Long id);
    // 4. 관리자 기능
    boolean registerNotice(NoticeDTO noticeDTO);
    boolean modifyNotice(NoticeDTO noticeDTO);
    boolean removeNotice(Long id);
}