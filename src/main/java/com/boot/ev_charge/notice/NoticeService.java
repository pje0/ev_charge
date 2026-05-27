package com.boot.ev_charge.notice;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NoticeService{

    private final NoticeMapper noticeMapper;

    public List<NoticeDTO> getNoticeList(NoticeCriteria cri) {
        // 검색, 카테고리, 페이징 정보가 담긴 cri를 그대로 DAO에 전달
        return noticeMapper.selectNoticeList(cri);
    }

    public int getTotalCount(NoticeCriteria cri) {
        // 현재 검색 조건에 맞는 게시글의 총 개수 반환
        return noticeMapper.selectNoticeCount(cri);
    }

    @Transactional // 조회수 증가와 조회를 원자적으로 처리
    public NoticeDTO getNoticeDetail(Long id) {
    	noticeMapper.updateViews(id); // 조회수 1 증가
        return noticeMapper.selectNoticeDetail(id);
    }

    public boolean registerNotice(NoticeDTO noticeDTO) {
        return noticeMapper.insertNotice(noticeDTO) > 0;
    }

    public boolean modifyNotice(NoticeDTO noticeDTO) {
        return noticeMapper.updateNotice(noticeDTO) > 0;
    }

    public boolean removeNotice(Long id) {
        return noticeMapper.deleteNotice(id) > 0;
    }
}