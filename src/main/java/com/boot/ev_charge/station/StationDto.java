package com.boot.ev_charge.station;

import lombok.Data;

@Data
public class StationDto {
    private Long id;
    private String name;
    private String address;
    private String metro;
    private String city;
    private Integer rapidCnt;
    private Integer slowCnt;
    private String carType;
    private Double latitude;
    private Double longitude;
}