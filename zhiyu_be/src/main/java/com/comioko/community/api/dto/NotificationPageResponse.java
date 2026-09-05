package com.comioko.community.api.dto;

import java.util.List;

public record NotificationPageResponse(List<NotificationResponse> items, int unreadCount) { }
