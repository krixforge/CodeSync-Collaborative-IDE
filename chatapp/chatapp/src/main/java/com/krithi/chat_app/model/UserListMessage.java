package com.krithi.chat_app.model;

import java.util.Set;

public class UserListMessage {

    private Set<String> users;

    public UserListMessage() {
    }

    public UserListMessage(
            Set<String> users) {

        this.users = users;
    }

    public Set<String> getUsers() {
        return users;
    }

    public void setUsers(
            Set<String> users) {

        this.users = users;
    }
}