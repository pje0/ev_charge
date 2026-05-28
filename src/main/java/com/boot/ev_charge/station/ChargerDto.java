package com.boot.ev_charge.station;

import lombok.Data;

@Data
public class ChargerDto {
    private Long id;
    private Long stationId;
    private String connectorType;
    private Double powerKw;
    private String status;
    private int reservedSlotCount; //오늘 이 충전기에 예약된 30분 슬롯 총 개수를 담을 그릇 추가
}