package com.boot.ev_charge.favorite;

import com.boot.ev_charge.user.UserDto;
import com.boot.ev_charge.user.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    @Autowired
    private FavoriteService favoriteService;

    @Autowired
    private UserMapper userMapper;

    // 즐겨찾기 토글 (추가/삭제)
    @PostMapping("/toggle")
    public Map<String, Object> toggle(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Long> body) {

        UserDto user = userMapper.findByLoginId(userDetails.getUsername());
        Long stationId = body.get("stationId");
        favoriteService.toggle(user.getId(), stationId);
        boolean isFav = favoriteService.isFavorite(user.getId(), stationId);
        return Map.of("favorite", isFav);
    }

    // 즐겨찾기 목록 조회 (station id 목록)
    @GetMapping("/ids")
    public List<Long> getFavoriteIds(
            @AuthenticationPrincipal UserDetails userDetails) {

        UserDto user = userMapper.findByLoginId(userDetails.getUsername());
        return favoriteService.getFavoriteStationIds(user.getId());
    }
}