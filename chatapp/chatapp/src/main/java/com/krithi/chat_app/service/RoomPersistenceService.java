package com.krithi.chat_app.service;

import com.krithi.chat_app.entity.Room;
import com.krithi.chat_app.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class RoomPersistenceService {

    private final RoomRepository roomRepository;

    public RoomPersistenceService(
            RoomRepository roomRepository) {

        this.roomRepository = roomRepository;
    }

    public void saveRoom(
            String roomId,
            String code,
            String language
    ) {

        Room room =
                roomRepository.findById(roomId)
                        .orElse(new Room());

        room.setRoomId(roomId);
        room.setCode(code);
        room.setLanguage(language);
        room.setLastUpdated(
                LocalDateTime.now()
        );

        roomRepository.save(room);
    }

    public Room getRoom(
            String roomId) {

        return roomRepository
                .findById(roomId)
                .orElse(null);
    }
}