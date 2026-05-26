package com.boot.ev_charge.notice;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface NoticeDAO {
    // 1. [통합] 공지사항 목록 조회 (검색 + 페이징 + 카테고리)
    List<NoticeDTO> selectNoticeList(NoticeCriteria cri);

    // 2. [통합] 공지사항 총 개수 조회 (페이징 하단 번호 계산용)
    int selectNoticeCount(NoticeCriteria cri);

    // 3. 상세 조회 (기존 유지)
    NoticeDTO selectNoticeDetail(Long id);

    // 4. 조회수 증가 (기존 유지)
    int updateViews(Long id);

    // 5. 관리자 기능 (기존 유지)
    int insertNotice(NoticeDTO noticeDTO);
    int updateNotice(NoticeDTO noticeDTO);
    int deleteNotice(Long id);
}