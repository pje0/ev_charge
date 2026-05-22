package com.boot.ev_charge.map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Controller
public class MapController {

    private static final String KEPCO_API_KEY = "여기에한전API키입력";
    private static final String KEPCO_API_URL = "https://bigdata.kepco.co.kr/openapi/v1/EVcharge.do";

    @GetMapping("/map")
    public String map() {
        return "map/map";
    }

    @GetMapping("/api/stations")
    @ResponseBody
    public Object getStations(
            @RequestParam(value = "metroCd", defaultValue = "11") String metroCd,
            @RequestParam(value = "cityCd", required = false) String cityCd) {

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = KEPCO_API_URL + "?metroCd=" + metroCd + "&apiKey=" + KEPCO_API_KEY + "&returnType=json";
            if (cityCd != null && !cityCd.isEmpty()) {
                url += "&cityCd=" + cityCd;
            }
            Map result = restTemplate.getForObject(url, Map.class);
            return result;
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }
}