package com.boot.ev_charge.vehicle;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class VehicleService { // 💡 에러 원인이던 abstract 키워드 제거
	
	@Autowired
	private VehicleMapper vehicleMapper;
	
	// 내 차량 목록 조회
	public List<VehicleDto> getUserVehicles(Long userId) {
		return vehicleMapper.getUserVehicleList(userId);
	}
	
	// 마스터 DB에서 모든 차량 제원 목록 가져오기 (모달/셀렉트박스용)
	public List<VehicleDto> getAllEvModels() {
		return vehicleMapper.getAllEvModels();
	}
	
	// 내 차량 등록 (최초 등록 시 자동으로 대표 차량 설정 로직 추가 가능)
	public void registerVehicle(VehicleDto dto) {
		// 기존에 등록된 차량이 없다면 이 차량을 바로 대표 차량으로 설정
		List<VehicleDto> existingList = vehicleMapper.getUserVehicleList(dto.getUserId());
		if (existingList.isEmpty()) {
			dto.setIsPrimary(true);
		} else {
			dto.setIsPrimary(false);
		}
		
		vehicleMapper.insertUserVehicle(dto);
		log.info("## [VehicleService] 신규 차량 등록 완료 -> User: {}, ModelId: {}", dto.getUserId(), dto.getModelId());
	}
	
	// 내 차량 삭제
	public boolean deleteVehicle(Long vehicleId, Long userId) {
		return vehicleMapper.deleteUserVehicle(vehicleId, userId) > 0;
	}
	
	// 🌟 대표 차량 변경 로직 (트랜잭션 필수)
	public void changePrimaryVehicle(Long vehicleId, Long userId) {
		// 1. 유저의 모든 차량의 대표 여부를 0(false)으로 초기화
		vehicleMapper.resetPrimaryVehicle(userId);
		
		// 2. 선택한 차량만 1(true)로 세팅
		vehicleMapper.setPrimaryVehicle(vehicleId, userId);
		log.info("## [VehicleService] 대표 차량 변경 완료 -> User: {}, NewPrimary: {}", userId, vehicleId);
	}

    // =====================================================================
    // 🌟 [에러 해결된 메서드] 유저의 대표 차량 1대만 찾아서 반환
    // =====================================================================
    public VehicleDto getPrimaryVehicleByUserId(Long userId) { // default 대신 public 사용
        // 상단에 이미 만들어둔 getUserVehicles() 메서드를 재사용합니다!
        List<VehicleDto> allMyCars = getUserVehicles(userId);
        
        if (allMyCars != null && !allMyCars.isEmpty()) {
            for (VehicleDto car : allMyCars) {
                // 대표 차량 체크 (Boolean 타입 null 방지 연산)
                if (Boolean.TRUE.equals(car.getIsPrimary())) {
                    return car; // 대표 차량이면 즉시 리턴
                }
            }
            // 만약 대표 차량 설정이 안 되어있다면, 그냥 등록된 첫 번째 차를 임시 대표차로 취급!
            return allMyCars.get(0); 
        }
        return null; // 등록된 차가 아예 없으면 null 반환
    }
}