package com.boot.ev_charge.reservation;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.boot.ev_charge.station.StationDto;
import com.boot.ev_charge.station.ChargerDto;

@Mapper
public interface ReservationMapper {
    int insertReservation(ReservationDto reservationDto);
    int insertReservationTime(ReservationDto reservationDto);
    int insertReservationTarget(ReservationDto reservationDto);
    int countDuplicateReservation(ReservationDto reservationDto);
    ReservationDto getReservationDetail(Long reservationId);
    List<ReservationDto> getReservationListByUser(Long userId);
    int startCharging(Long reservationId);
    int completeCharging(Long reservationId);
    int cancelReservation(Long reservationId);
    int expireReservation();
    List<ChargerDto> getChargerList();
    List<Map<String, Object>> getReservedTimes(@Param("chargerId") Long chargerId, @Param("date") String date);
    List<StationDto> getStationList();   
    List<ChargerDto> getChargersByStationId(@Param("stationId") Long stationId);
}