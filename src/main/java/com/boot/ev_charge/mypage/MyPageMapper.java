package com.boot.ev_charge.mypage;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MyPageMapper {
	MyPageDto getUserById(int userId);
	int updateUser(MyPageDto dto);
	List<MyPageDto> selectUpcomingReservations(int userId);
    List<MyPageDto> selectPastReservations(int userId);
    int deleteReservation(Long reservationId);
    int updateReservationMaster(MyPageDto dto);
    int updateReservationTime(MyPageDto dto);
    int upsertReservationTarget(MyPageDto dto);
    MyPageDto getReservationById(Long reservationId);
}
