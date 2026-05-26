package com.boot.ev_charge.station;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface StationMapper {
    void insertStation(StationDto station);
    List<StationDto> findAll();
    StationDto findById(Long id);
    int countByAddress(String address);
}