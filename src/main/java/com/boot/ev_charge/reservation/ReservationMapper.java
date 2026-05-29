package com.boot.ev_charge.reservation;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.boot.ev_charge.station.ChargerDto;
import com.boot.ev_charge.station.StationDto;

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
    List<ReservationDto> getReservedTimes(
            @Param("chargerId") Long chargerId, 
            @Param("stationId") Long stationId, 
            @Param("date") String date
        );
    List<StationDto> getStationList();   
    List<ChargerDto> getChargersByStationId(@Param("stationId") Long stationId);
    // [관리자 전용] 검색 조건부 전체 예약 데이터 가져오기
    List<ReservationDto> getAdminReservationList(
            @Param("searchStatus") String searchStatus,
            @Param("searchType") String searchType,
            @Param("searchKeyword") String searchKeyword
    );

    // [관리자 전용] 리스트 즉시 삭제를 위한 메서드
    int deleteReservationById(@Param("reservationId") Long reservationId);
}