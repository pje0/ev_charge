package com.boot.ev_charge.vehicle;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserService;

import lombok.extern.slf4j.Slf4j;

@Controller
@RequestMapping("/mypage/vehicle")
@Slf4j
public class VehicleController {

    @Autowired
    private VehicleService vehicleService;
    
    @Autowired
    private UserService userService;

    // 1. 내 차량 목록 데이터 API (JSON 반환)
    @GetMapping("/list")
    @ResponseBody
    public ResponseEntity<?> getMyVehicles(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).body("Unauthorized");
        
        UserDto user = userService.findByLoginId(userDetails.getUsername());
        List<VehicleDto> list = vehicleService.getUserVehicles(user.getId());
        
        return ResponseEntity.ok(list);
    }

    // 2. 전체 전기차 마스터 데이터 API (등록 모달창 렌더링용)
    @GetMapping("/models")
    @ResponseBody
    public ResponseEntity<List<VehicleDto>> getEvModels() {
        return ResponseEntity.ok(vehicleService.getAllEvModels());
    }

    // 3. 신규 차량 등록 처리
    @PostMapping("/register")
    @ResponseBody
    public ResponseEntity<?> registerVehicle(@RequestBody VehicleDto dto, 
                                             @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).body("Unauthorized");
        
        try {
            UserDto user = userService.findByLoginId(userDetails.getUsername());
            dto.setUserId(user.getId());
            
            vehicleService.registerVehicle(dto);
            return ResponseEntity.ok().body(Map.of("message", "등록 성공"));
            
        } catch (Exception e) {
            log.error("## 차량 등록 에러: ", e);
            return ResponseEntity.badRequest().body(Map.of("message", "등록 실패"));
        }
    }

    // 4. 차량 삭제 처리
    @PostMapping("/delete")
    @ResponseBody
    public ResponseEntity<?> deleteVehicle(@RequestParam("vehicleId") Long vehicleId, 
                                           @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).body("Unauthorized");
        
        UserDto user = userService.findByLoginId(userDetails.getUsername());
        boolean result = vehicleService.deleteVehicle(vehicleId, user.getId());
        
        if(result) return ResponseEntity.ok().body("SUCCESS");
        else return ResponseEntity.badRequest().body("FAIL");
    }

    // 5. 대표 차량 설정 처리
    @PostMapping("/primary")
    @ResponseBody
    public ResponseEntity<?> setPrimaryVehicle(@RequestParam("vehicleId") Long vehicleId, 
                                               @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).body("Unauthorized");
        
        UserDto user = userService.findByLoginId(userDetails.getUsername());
        try {
            vehicleService.changePrimaryVehicle(vehicleId, user.getId());
            return ResponseEntity.ok().body("SUCCESS");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("FAIL");
        }
    }
}