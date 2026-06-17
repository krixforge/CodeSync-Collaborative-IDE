package com.krithi.chat_app.repository;

import com.krithi.chat_app.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository
        extends JpaRepository<Room, String> {
}