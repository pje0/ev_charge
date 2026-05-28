package com.boot.ev_charge.station;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
public class StationService {

    @Autowired
    private StationMapper stationMapper;

    @Autowired
    private ChargerMapper chargerMapper;

    private static final String[] STATUSES = {
        "AVAILABLE","AVAILABLE","AVAILABLE","AVAILABLE","AVAILABLE",
        "AVAILABLE","AVAILABLE","IN_USE","IN_USE","OUT_OF_SERVICE"
    };

    public void insertStationWithChargers(StationDto dto) {
        // 중복 체크
        if (stationMapper.countByAddress(dto.getAddress()) > 0) return;

        stationMapper.insertStation(dto);
        Long stationId = dto.getId();
        Random random = new Random();

        // 급속 charger INSERT
        int rapidCnt = dto.getRapidCnt() != null ? dto.getRapidCnt() : 0;
        for (int i = 0; i < rapidCnt; i++) {
            ChargerDto charger = new ChargerDto();
            charger.setStationId(stationId);
            charger.setConnectorType("RAPID");
            charger.setPowerKw(50.0);
            charger.setStatus(STATUSES[random.nextInt(STATUSES.length)]);
            chargerMapper.insertCharger(charger);
        }

        // 완속 charger INSERT
        int slowCnt = dto.getSlowCnt() != null ? dto.getSlowCnt() : 0;
        for (int i = 0; i < slowCnt; i++) {
            ChargerDto charger = new ChargerDto();
            charger.setStationId(stationId);
            charger.setConnectorType("SLOW");
            charger.setPowerKw(7.0);
            charger.setStatus(STATUSES[random.nextInt(STATUSES.length)]);
            chargerMapper.insertCharger(charger);
        }
    }
    
    public List<StationDto> getStations(String metro, String city) {
        return stationMapper.findByMetroAndCity(metro, city);
    }
}