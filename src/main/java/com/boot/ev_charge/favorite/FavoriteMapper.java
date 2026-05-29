package com.boot.ev_charge.favorite;

import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface FavoriteMapper {
    void insert(FavoriteDto dto);
    void delete(FavoriteDto dto);
    int count(FavoriteDto dto);
    List<Long> findStationIdsByUserId(Long userId);
}