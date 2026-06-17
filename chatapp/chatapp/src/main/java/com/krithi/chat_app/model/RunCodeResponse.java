package com.krithi.chat_app.model;

public class RunCodeResponse {

    private String output;

    public RunCodeResponse(
            String output) {

        this.output = output;
    }

    public String getOutput() {
        return output;
    }

    public void setOutput(
            String output) {

        this.output = output;
    }
}