package com.krithi.chat_app.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.krithi.chat_app.model.RunCodeRequest;
import com.krithi.chat_app.model.RunCodeResponse;
import com.krithi.chat_app.service.Judge0Service;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/code")
@CrossOrigin("*")
public class CodeExecutionController {

    private final Judge0Service judge0Service;

    public CodeExecutionController(
            Judge0Service judge0Service
    ) {
        this.judge0Service = judge0Service;
    }

    @PostMapping("/run")
    public RunCodeResponse runCode(
            @RequestBody RunCodeRequest request
    ) {

        int languageId = switch (
                request.getLanguage()
                ) {

            case "java" -> 62;
            case "python" -> 71;
            case "javascript" -> 63;
            case "cpp" -> 54;

            default -> 62;
        };

        String response =
                judge0Service.runCode(
                        request.getCode(),
                        languageId
                );

        try {

            ObjectMapper mapper =
                    new ObjectMapper();

            JsonNode json =
                    mapper.readTree(response);

            String output =
                    json.has("stdout") && json.get("stdout") != null
                            ? json.get("stdout").asText()
                            : "No output";

            return new RunCodeResponse(
                    output
            );

        } catch (Exception e) {

            return new RunCodeResponse(
                    "Error parsing Judge0 response: "
                            + e.getMessage()
            );
        }
    }
}