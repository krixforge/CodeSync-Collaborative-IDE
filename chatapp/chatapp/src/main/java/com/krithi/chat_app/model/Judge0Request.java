package com.krithi.chat_app.model;

public class Judge0Request {

    private String source_code;
    private Integer language_id;

    public Judge0Request(
            String source_code,
            Integer language_id) {

        this.source_code = source_code;
        this.language_id = language_id;
    }

    public String getSource_code() {
        return source_code;
    }

    public Integer getLanguage_id() {
        return language_id;
    }
}