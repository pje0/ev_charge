package com.boot.ev_charge.station;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ChargerMapper {
    void insertCharger(ChargerDto charger);
}