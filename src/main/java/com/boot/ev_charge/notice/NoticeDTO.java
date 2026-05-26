package com.boot.ev_charge.notice;

import lombok.Data;

@Data
public class NoticeDTO {
    private Long id;
    private String category;
    private String title;
    private String content;
    private Long writerId;
    private String writerName;
    private boolean pinned; 
    private int views;
    private String createdAt;
}