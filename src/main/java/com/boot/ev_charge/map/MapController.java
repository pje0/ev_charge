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

    private static final String KAKAO_REST_API_KEY = "bf89423ca79768c09205e2a14d31c2a6";

    @Autowired
    private StationService stationService;

    // 지도 페이지
    @GetMapping("/map")
    public String map() {
        return "map/map";
    }

    // 한전 API 조회
    @GetMapping("/api/stations")
    @ResponseBody
    public Object getStations(
            @RequestParam(value = "metroCd", defaultValue = "11") String metroCd,
            @RequestParam(value = "cityCd", required = false) String cityCd) {

        try {

            String url = KEPCO_API_URL
                    + "?metroCd=" + metroCd
                    + "&apiKey=" + KEPCO_API_KEY
                    + "&returnType=json";

            if (cityCd != null && !cityCd.isEmpty()) {
                url += "&cityCd=" + cityCd;
            }

            RestTemplate restTemplate = new RestTemplate();

            restTemplate.getMessageConverters().add(
                    0,
                    new org.springframework.http.converter.StringHttpMessageConverter(
                            java.nio.charset.StandardCharsets.UTF_8
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "*/*");
            headers.set("User-Agent", "Mozilla/5.0");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            ObjectMapper mapper = new ObjectMapper();

            return mapper.readValue(response.getBody(), Map.class);

        } catch (Exception e) {

            e.printStackTrace();

            return Map.of(
                    "error", e.getMessage()
            );
        }
    }

    // DB 충전소 조회
    @GetMapping("/api/stations/db")
    @ResponseBody
    public Object getStationsFromDb(
            @RequestParam(name = "metroCd", required = false) String metro,
            @RequestParam(name = "city", required = false) String city) {

        return stationService.getStations(metro, city);
    }

    // DB 초기화 + 좌표 저장
    @GetMapping("/api/stations/init")
    @ResponseBody
    public Object initStations(
            @RequestParam(name = "metroCd", defaultValue = "11") String metroCd) {

        try {

            String url = KEPCO_API_URL
                    + "?metroCd=" + metroCd
                    + "&apiKey=" + KEPCO_API_KEY
                    + "&returnType=json";

            RestTemplate restTemplate = new RestTemplate();

            restTemplate.getMessageConverters().add(
                    0,
                    new org.springframework.http.converter.StringHttpMessageConverter(
                            java.nio.charset.StandardCharsets.UTF_8
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "*/*");
            headers.set("User-Agent", "Mozilla/5.0");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            ObjectMapper mapper = new ObjectMapper();

            Map result = mapper.readValue(response.getBody(), Map.class);

            List<Map> dataList = (List<Map>) result.get("data");

            if (dataList == null) {

                return Map.of(
                        "error", "데이터 없음"
                );
            }

            int success = 0;

            for (Map station : dataList) {

                try {

                    // 충전소 주소
                    String address = (String) station.get("stnAddr");

                    // 카카오 주소 검색 API
                    org.springframework.web.util.UriComponentsBuilder builder =
                            org.springframework.web.util.UriComponentsBuilder
                                    .fromHttpUrl("https://dapi.kakao.com/v2/local/search/address.json")
                                    .queryParam("query", address);

                    HttpHeaders kakaoHeaders = new HttpHeaders();

                    kakaoHeaders.set(
                            "Authorization",
                            "KakaoAK " + KAKAO_REST_API_KEY
                    );

                    HttpEntity<String> kakaoEntity =
                            new HttpEntity<>(kakaoHeaders);

                    ResponseEntity<String> kakaoResponse =
                    	    restTemplate.exchange(
                    	        builder.build().encode().toUri(),
                    	        HttpMethod.GET,
                    	        kakaoEntity,
                    	        String.class
                    	    );

                    // 로그
                    System.out.println("주소: " + address);
                    System.out.println("카카오 응답: " + kakaoResponse.getBody());

                    Map kakaoResult =
                            mapper.readValue(kakaoResponse.getBody(), Map.class);

                    List<Map> documents =
                            (List<Map>) kakaoResult.get("documents");

                    Double lat = null;
                    Double lng = null;

                    // 좌표 추출
                    if (documents != null && !documents.isEmpty()) {

                        Map first = documents.get(0);

                        lat = Double.parseDouble(
                                (String) first.get("y")
                        );

                        lng = Double.parseDouble(
                                (String) first.get("x")
                        );

                        System.out.println("위도: " + lat);
                        System.out.println("경도: " + lng);

                    } else {

                        System.out.println("좌표 검색 실패");
                    }

                    // DTO 생성
                    StationDto dto = new StationDto();

                    dto.setName(
                            (String) station.get("stnPlace")
                    );

                    dto.setAddress(address);

                    dto.setMetro(
                            (String) station.get("metro")
                    );

                    dto.setCity(
                            (String) station.get("city")
                    );

                    dto.setRapidCnt(
                            (Integer) station.get("rapidCnt")
                    );

                    dto.setSlowCnt(
                            (Integer) station.get("slowCnt")
                    );

                    dto.setCarType(
                            (String) station.get("carType")
                    );

                    dto.setLatitude(lat);
                    dto.setLongitude(lng);

                    // DB 저장
                    stationService.insertStationWithChargers(dto);

                    success++;

                    Thread.sleep(50);

                } catch (Exception e) {

                    System.out.println("충전소 저장 오류");
                    e.printStackTrace();
                }
            }

            return Map.of(
                    "success", success,
                    "total", dataList.size()
            );

        } catch (Exception e) {

            e.printStackTrace();

            return Map.of(
                    "error", e.getMessage()
            );
        }
    }
    
    @GetMapping("/api/directions")
    @ResponseBody
    public Object getDirections(
            @RequestParam(name = "startLat") double startLat,
            @RequestParam(name = "startLng") double startLng,
            @RequestParam(name = "endLat") double endLat,
            @RequestParam(name = "endLng") double endLng) {
        try {
            org.springframework.web.util.UriComponentsBuilder builder =
                org.springframework.web.util.UriComponentsBuilder
                .fromHttpUrl("https://apis-navi.kakaomobility.com/v1/directions")
                    .queryParam("origin", startLng + "," + startLat)
                    .queryParam("destination", endLng + "," + endLat)
                    .queryParam("priority", "RECOMMEND")
                    .queryParam("road_details", true);

            HttpHeaders kakaoHeaders = new HttpHeaders();
            kakaoHeaders.set("Authorization", "KakaoAK " + KAKAO_REST_API_KEY);
            HttpEntity<String> kakaoEntity = new HttpEntity<>(kakaoHeaders);

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> response = restTemplate.exchange(
                builder.build().encode().toUri(),
                HttpMethod.GET,
                kakaoEntity,
                String.class
            );

            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(response.getBody(), Map.class);

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("error", e.getMessage());
        }
    }
}