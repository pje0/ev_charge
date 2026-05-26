package com.boot.ev_charge.map;

import com.boot.ev_charge.station.StationDto;
import com.boot.ev_charge.station.StationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Controller
public class MapController {

    private static final String KEPCO_API_KEY = "F7IZs1O7tMO0nkpP725cs1fhuVene2E0XX51f1qZ";
    private static final String KEPCO_API_URL = "https://bigdata.kepco.co.kr/openapi/v1/EVcharge.do";
    private static final String KAKAO_REST_API_KEY = "카카오REST API키여기";

    @Autowired
    private StationService stationService;

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
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(response.getBody(), Map.class);
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }

    @GetMapping("/api/stations/init")
    @ResponseBody
    public Object initStations(@RequestParam(defaultValue = "11") String metroCd) {
        try {
            String url = KEPCO_API_URL + "?metroCd=" + metroCd + "&apiKey=" + KEPCO_API_KEY + "&returnType=json";
            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getMessageConverters().add(0,
                new org.springframework.http.converter.StringHttpMessageConverter(java.nio.charset.StandardCharsets.UTF_8));
            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "*/*");
            headers.set("User-Agent", "Mozilla/5.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            ObjectMapper mapper = new ObjectMapper();
            Map result = mapper.readValue(response.getBody(), Map.class);
            List<Map> dataList = (List<Map>) result.get("data");
            if (dataList == null) return Map.of("error", "데이터 없음");

            int success = 0;
            for (Map station : dataList) {
                try {
                    String stnAddr = (String) station.get("stnAddr");

                    // 카카오 geocoding
                    String kakaoUrl = "https://dapi.kakao.com/v2/local/search/address.json?query="
                        + java.net.URLEncoder.encode(stnAddr, "UTF-8");
                    HttpHeaders kakaoHeaders = new HttpHeaders();
                    kakaoHeaders.set("Authorization", "KakaoAK " + KAKAO_REST_API_KEY);
                    HttpEntity<String> kakaoEntity = new HttpEntity<>(kakaoHeaders);
                    ResponseEntity<String> kakaoResponse = restTemplate.exchange(
                        kakaoUrl, HttpMethod.GET, kakaoEntity, String.class);
                    Map kakaoResult = mapper.readValue(kakaoResponse.getBody(), Map.class);
                    List<Map> documents = (List<Map>) kakaoResult.get("documents");

                    Double lat = null;
                    Double lng = null;
                    if (documents != null && !documents.isEmpty()) {
                        lat = Double.parseDouble((String) documents.get(0).get("y"));
                        lng = Double.parseDouble((String) documents.get(0).get("x"));
                    }

                    StationDto dto = new StationDto();
                    dto.setName((String) station.get("stnPlace"));
                    dto.setAddress(stnAddr);
                    dto.setMetro((String) station.get("metro"));
                    dto.setCity((String) station.get("city"));
                    dto.setRapidCnt((Integer) station.get("rapidCnt"));
                    dto.setSlowCnt((Integer) station.get("slowCnt"));
                    dto.setCarType((String) station.get("carType"));
                    dto.setLatitude(lat);
                    dto.setLongitude(lng);

                    stationService.insertStationWithChargers(dto);
                    success++;
                    Thread.sleep(100);
                } catch (Exception e) {
                    // 개별 오류 무시
                }
            }
            return Map.of("success", success, "total", dataList.size());
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }
}