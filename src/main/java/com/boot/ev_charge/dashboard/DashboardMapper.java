package com.boot.ev_charge.dashboard;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DashboardMapper {

    DashboardDTO getDashboardSummary();

}