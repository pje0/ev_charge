package com.boot.ev_charge.reservation;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.boot.ev_charge.station.ChargerDto;

@Mapper
public interface ReservationMapper {
    int insertReservation(ReservationDto dto);
    int insertReservationTime(ReservationDto dto);
    int insertReservationTarget(ReservationDto dto);
    int countDuplicateReservation(ReservationDto dto);
    ReservationDto getReservationDetail(Long reservationId);
    List<ReservationDto> getReservationListByUser(Long userId);
    int startCharging(Long reservationId);
    int completeCharging(Long reservationId);
    int cancelReservation(Long reservationId);
    int expireReservation();
    List<ChargerDto> getChargerList();
    List<ReservationDto> getReservedTimes(@Param("chargerId") Long chargerId, @Param("date") String date);
}