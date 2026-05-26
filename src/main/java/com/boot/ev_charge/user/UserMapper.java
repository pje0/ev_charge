package com.boot.ev_charge.user;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    
    // 로그인용 아이디로 회원 조회
    UserDto findByLoginId(String loginId);
    
    // 회원가입
    int insert(UserDto user);
    
    // 아이디 중복 체크
    int countByLoginId(String loginId);
    
    // 이메일 중복 체크
    int countByEmail(String email);
    
    
}