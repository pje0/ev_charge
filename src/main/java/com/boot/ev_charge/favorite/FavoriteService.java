package com.boot.ev_charge.favorite;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FavoriteService {

    @Autowired
    private FavoriteMapper favoriteMapper;

    public void toggle(Long userId, Long stationId) {
        FavoriteDto dto = new FavoriteDto();
        dto.setUserId(userId);
        dto.setStationId(stationId);
        if (favoriteMapper.count(dto) > 0) {
            favoriteMapper.delete(dto);
        } else {
            favoriteMapper.insert(dto);
        }
    }

    public List<Long> getFavoriteStationIds(Long userId) {
        return favoriteMapper.findStationIdsByUserId(userId);
    }

    public boolean isFavorite(Long userId, Long stationId) {
        FavoriteDto dto = new FavoriteDto();
        dto.setUserId(userId);
        dto.setStationId(stationId);
        return favoriteMapper.count(dto) > 0;
    }
}