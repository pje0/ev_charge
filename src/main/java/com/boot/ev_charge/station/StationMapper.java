package com.boot.ev_charge.station;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface StationMapper {
    void insertStation(StationDto station);
    List<StationDto> findAll();
    StationDto findById(Long id);
    int countByAddress(String address);
    List<StationDto> findByMetroAndCity(@Param("metro") String metro, @Param("city") String city);
}