package com.boot.ev_charge.vehicle;

import java.sql.Timestamp;
import lombok.Data;

@Data
public class VehicleDto {
	// [사용자 차량 고유 정보 - user_vehicle]
    private Long id;                // 사용자 차량 등록 PK
    private Long userId;            // 소유자 ID
    private Long modelId;           // 선택한 전기차 모델 PK
    private String carNumber;       // 차량 번호 (옵션)
    private String nickname;        // 차량 별명 (옵션)
    private Boolean isPrimary;      // 대표 차량 여부
    private Timestamp createdAt;

    // [전기차 마스터 제원 정보 - ev_model 조인 데이터]
    private String manufacturer;    // 제조사 (현대, 기아 등)
    private String modelName;       // 차량명 (아이오닉5 등)
    private String carSize;         // 차급 (중형, 소형 등)
    private String connectorType;   // 충전방식 (DC_COMBO 등)
    private Double batteryCapacity; // 배터리 용량 (kWh)
    private Integer maxRange;       // 1회 충전 주행거리
    private Double efficiency;      // 전비
}
