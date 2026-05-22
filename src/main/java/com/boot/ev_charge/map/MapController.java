package com.boot.ev_charge.map;

import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.client.RestTemplate;

@Controller
public class MapController {

    private static final String KEPCO_API_KEY = "F7IZs1O7tMO0nkpP725cs1fhuVene2E0XX51f1qZ";
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
            String url = KEPCO_API_URL + "?metroCd=" + metroCd + "&apiKey=" + KEPCO_API_KEY + "&returnType=json";
            if (cityCd != null && !cityCd.isEmpty()) {
                url += "&cityCd=" + cityCd;
            }

            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getMessageConverters().add(0, 
                new org.springframework.http.converter.StringHttpMessageConverter(java.nio.charset.StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "*/*");
            headers.set("User-Agent", "Mozilla/5.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            // String으로 받아서 파싱
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(response.getBody(), Map.class);
            
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }
}