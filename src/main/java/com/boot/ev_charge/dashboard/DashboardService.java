package com.boot.ev_charge.dashboard;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    @Autowired
    private DashboardMapper dashboardMapper;

    public DashboardDTO getDashboardSummary() {
        return dashboardMapper.getDashboardSummary();
    }
}