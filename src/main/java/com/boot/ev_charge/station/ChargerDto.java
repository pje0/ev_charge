package com.boot.ev_charge.station;

import lombok.Data;

@Data
public class ChargerDto {
    private Long id;
    private Long stationId;
    private String connectorType;
    private Double powerKw;
    private String status;
}