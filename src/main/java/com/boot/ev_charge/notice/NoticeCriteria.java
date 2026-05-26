package com.boot.ev_charge.notice;

import lombok.Data;

@Data
public class NoticeCriteria {
    
    // 1. 페이징 관련
    private int page;          // 현재 페이지 번호
    private int limit;         // 한 페이지당 보여줄 게시글 수
    private int offset;        // DB에서 가져올 시작점 (page-1 * limit)

    // 2. 검색 및 필터 관련
    private String category;   // 카테고리 필터 (전체, 공지, 점검 등)
    private String searchKeyword; // 검색 키워드

    // 기본 생성자: 처음 게시판 들어왔을 때 초기값 설정
    public NoticeCriteria() {
        this.page = 1;
        this.limit = 10; // 한 페이지에 10개씩
        this.category = "전체";
        this.searchKeyword = "";
    }

    // MyBatis에서 사용할 offset 계산 (getter를 통해 자동 계산)
    public int getOffset() {
        return (this.page - 1) * this.limit;
    }
}