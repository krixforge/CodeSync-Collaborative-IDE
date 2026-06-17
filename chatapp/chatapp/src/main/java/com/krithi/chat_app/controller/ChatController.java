package com.krithi.chat_app.controller;

import com.krithi.chat_app.model.ChatMessage;
import com.krithi.chat_app.model.CodeMessage;
import com.krithi.chat_app.model.UserListMessage;
import com.krithi.chat_app.service.RoomService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import com.krithi.chat_app.model.LanguageMessage;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import com.krithi.chat_app.service.RoomPersistenceService;

@Controller
public class ChatController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final RoomPersistenceService roomPersistenceService;

    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            RoomService roomService,
            RoomPersistenceService roomPersistenceService) {

        this.messagingTemplate = messagingTemplate;
        this.roomService = roomService;
        this.roomPersistenceService =
                roomPersistenceService;
    }

    @MessageMapping("/send")
    public void sendMessage(ChatMessage message) {

        message.setTimestamp(
                LocalTime.now()
                        .format(
                                DateTimeFormatter
                                        .ofPattern("HH:mm:ss")
                        )
        );

        messagingTemplate.convertAndSend(
                "/topic/" +
                        message.getRoomId(),
                message
        );
    }
    @MessageMapping("/code")
    public void updateCode(CodeMessage message) {

        System.out.println("SAVE ROOM CALLED");
        System.out.println(message.getRoomId());

        roomPersistenceService.saveRoom(
                message.getRoomId(),
                message.getCode(),
                message.getLanguage()
        );

        messagingTemplate.convertAndSend(
                "/topic/code/" +
                        message.getRoomId(),
                message
        );
    }
    @MessageMapping("/language")
    public void updateLanguage(
            LanguageMessage message) {

        messagingTemplate.convertAndSend(
                "/topic/language/" +
                        message.getRoomId(),
                message
        );
    }
    @MessageMapping("/join")
    public void joinRoom(
            ChatMessage message) {

        roomService.joinRoom(
                message.getRoomId(),
                message.getSender()
        );

        messagingTemplate.convertAndSend(
                "/topic/users/" +
                        message.getRoomId(),

                new UserListMessage(
                        roomService.getUsers(
                                message.getRoomId()
                        )
                )
        );

        ChatMessage systemMessage =
                new ChatMessage();

        systemMessage.setSender(
                "System"
        );

        systemMessage.setContent(
                message.getSender()
                        + " joined the room"
        );

        systemMessage.setRoomId(
                message.getRoomId()
        );

        systemMessage.setTimestamp(
                LocalTime.now()
                        .format(
                                DateTimeFormatter
                                        .ofPattern("HH:mm:ss")
                        )
        );

        messagingTemplate.convertAndSend(
                "/topic/" +
                        message.getRoomId(),
                systemMessage
        );
    }
    @MessageMapping("/leave")
    public void leaveRoom(
            ChatMessage message) {

        roomService.leaveRoom(
                message.getRoomId(),
                message.getSender()
        );

        messagingTemplate.convertAndSend(
                "/topic/users/" +
                        message.getRoomId(),
                new UserListMessage(
                        roomService.getUsers(
                                message.getRoomId()
                        )
                )
        );

        ChatMessage systemMessage =
                new ChatMessage();

        systemMessage.setSender("System");

        systemMessage.setContent(
                message.getSender()
                        + " left the room"
        );

        systemMessage.setRoomId(
                message.getRoomId()
        );

        messagingTemplate.convertAndSend(
                "/topic/" +
                        message.getRoomId(),
                systemMessage
        );
    }
}