package com.boot.ev_charge.favorite;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FavoriteDto {
    private Long id;
    private Long userId;
    private Long stationId;
    private LocalDateTime createdAt;
}