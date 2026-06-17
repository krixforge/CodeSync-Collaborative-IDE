package com.krithi.chat_app.controller;

import com.krithi.chat_app.entity.Room;
import com.krithi.chat_app.service.RoomPersistenceService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin("*")
public class RoomController {

    private final RoomPersistenceService roomPersistenceService;

    public RoomController(
            RoomPersistenceService roomPersistenceService) {

        this.roomPersistenceService =
                roomPersistenceService;
    }

    @GetMapping("/{roomId}")
    public Room getRoom(
            @PathVariable String roomId) {

        return roomPersistenceService
                .getRoom(roomId);
    }
}