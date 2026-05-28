package com.boot.ev_charge.mypage;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder; //시큐리티 인코더 임포트
import org.springframework.stereotype.Service;

@Service
public class MyPageService {
	
	@Autowired
	private MyPageMapper myPageMapper;
	
	@Autowired
	private PasswordEncoder passwordEncoder; //시큐리티 비밀번호 암호화 빈 주입
	
	public MyPageDto getUserById(int userId) {
		return myPageMapper.getUserById(userId);
	}
	
	public boolean updateUserInfo(MyPageDto dto) {
	    // 1. DB에서 데이터 가져오기
	    MyPageDto dbUser = myPageMapper.getUserById(dto.getUserId());
	    
	    // 2. 비밀번호 변경 요청이 있는 경우에만 검증
	    if (dto.getPassword() != null && !dto.getPassword().trim().isEmpty()) {
	        
	        // [수정된 방어 로직] 
	        // 1. dbUser가 null이거나, DB에 저장된 비밀번호가 null이면 검증 불가 처리
	        // 2. dto의 현재 비밀번호가 null이면 false
	        if (dbUser == null || dbUser.getPassword() == null || dto.getCurrentPassword() == null) {
	            return false;
	        }

	        // 3. 이제 안전하게 trim() 호출
	        // 변경: 평문과 시큐리티 암호문 비교를 위해 passwordEncoder.matches()로 수정
	        if (!passwordEncoder.matches(dto.getCurrentPassword().trim(), dbUser.getPassword().trim())) {
	            return false;
	        }
	        
	        // 추가: 검증 통과 시 사용자가 입력한 새 비밀번호를 암호화하여 DTO에 다시 세팅
	        String securePassword = passwordEncoder.encode(dto.getPassword().trim());
	        dto.setPassword(securePassword);
	        
	    } else {
	        // 비밀번호를 변경하지 않을 때는 null로 설정하여 업데이트 대상에서 제외
	        dto.setPassword(null);
	    }

	    return myPageMapper.updateUser(dto) > 0;
	}
	
	// 기존 Service 파일 내부에 아래 두 메서드 라인만 추가해 주시면 됩니다.
	public List<MyPageDto> getUpcomingReservations(int userId) {
	    return myPageMapper.selectUpcomingReservations(userId);
	}

	public List<MyPageDto> getPastReservations(int userId) {
	    return myPageMapper.selectPastReservations(userId);
	}
	
	// 예약 삭제 로직
    public boolean cancelReservation(Long reservationId) {
        return myPageMapper.deleteReservation(reservationId) > 0;
    }

    // 예약 변경 로직
    public boolean modifyReservation(MyPageDto dto) {
        return myPageMapper.updateReservation(dto) > 0;
    }
    
    public MyPageDto getReservationById(Long reservationId) {
        // 예약 정보 조회용 쿼리가 매퍼에 없으면 추가 후 구현
        return myPageMapper.getReservationById(reservationId);
    }
}