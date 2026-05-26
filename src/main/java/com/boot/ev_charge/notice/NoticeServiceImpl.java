package com.boot.ev_charge.notice;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NoticeServiceImpl implements NoticeService {

    private final NoticeDAO noticeDAO;

    @Override
    public List<NoticeDTO> getNoticeList(String category) {
        // "전체" 카테고리일 경우 MyBatis에서 처리하기 쉽게 null이나 특정 값을 넘길 수 있습니다.
        return noticeDAO.selectNoticeList(category);
    }

    @Override
    @Transactional // 상세 조회와 조회수 증가를 하나의 작업으로 묶음
    public NoticeDTO getNoticeDetail(Long id) {
        noticeDAO.updateViews(id); // 조회수 1 증가
        return noticeDAO.selectNoticeDetail(id); // 상세 데이터 반환
    }

    @Override
    public boolean registerNotice(NoticeDTO noticeDTO) {
        return noticeDAO.insertNotice(noticeDTO) > 0;
    }

    @Override
    public boolean modifyNotice(NoticeDTO noticeDTO) {
        return noticeDAO.updateNotice(noticeDTO) > 0;
    }

    @Override
    public boolean removeNotice(Long id) {
        return noticeDAO.deleteNotice(id) > 0;
    }
    
}