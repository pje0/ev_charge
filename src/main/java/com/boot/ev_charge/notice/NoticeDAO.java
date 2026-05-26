package com.boot.ev_charge.notice;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface NoticeDAO {
    // [공통] 목록 조회 (카테고리 필터 포함)
    List<NoticeDTO> selectNoticeList(@Param("category") String category);

    // [공통] 상세 조회
    NoticeDTO selectNoticeDetail(Long id);

    // [공통] 조회수 증가
    int updateViews(Long id);

    // [관리자] 공지 등록
    int insertNotice(NoticeDTO noticeDTO);

    // [관리자] 공지 수정
    int updateNotice(NoticeDTO noticeDTO);

    // [관리자] 공지 삭제
    int deleteNotice(Long id);
}