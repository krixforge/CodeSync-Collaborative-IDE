package com.krithi.chat_app.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RoomService {

    private final Map<String, Set<String>> rooms =
            new HashMap<>();

    public void joinRoom(
            String roomId,
            String username) {

        rooms
                .computeIfAbsent(
                        roomId,
                        k -> new HashSet<>()
                )
                .add(username);
    }

    public void leaveRoom(
            String roomId,
            String username) {

        Set<String> users =
                rooms.get(roomId);

        if (users != null) {

            users.remove(username);

            if (users.isEmpty()) {
                rooms.remove(roomId);
            }
        }
    }

    public Set<String> getUsers(
            String roomId) {

        return rooms.getOrDefault(
                roomId,
                Collections.emptySet()
        );
    }
}