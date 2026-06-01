package com.boot.ev_charge.vehicle;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param; // 🟢 필수: Param 임포트 추가
import java.util.List;

@Mapper
public interface VehicleMapper {
    
    // 1. 특정 유저의 등록된 차량 목록 전체 조회
    List<VehicleDto> getUserVehicleList(Long userId);
    
    // 2. 새로운 차량 등록
    int insertUserVehicle(VehicleDto dto);
    
    // 3. 특정 차량 삭제 (🚨 @Param 추가)
    int deleteUserVehicle(@Param("vehicleId") Long vehicleId, @Param("userId") Long userId);
    
    // 4. 특정 유저의 모든 차량을 '일반(0)' 상태로 초기화 (파라미터 1개라 문제 없음)
    int resetPrimaryVehicle(Long userId);
    
    // 5. 특정 차량을 '대표(1)' 차량으로 설정 (🚨 @Param 추가)
    int setPrimaryVehicle(@Param("vehicleId") Long vehicleId, @Param("userId") Long userId);
    
    // 6. DB에 등록된 전기차 제원 마스터 목록 전체 조회
    List<VehicleDto> getAllEvModels();
    
    // 유저의 전체 등록 차량 목록 가져오기
    List<VehicleDto> getVehicleListByUserId(Long userId);
}