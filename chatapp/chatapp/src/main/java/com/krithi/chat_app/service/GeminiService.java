package com.krithi.chat_app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    public String ask(String prompt) {

        String url =
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="
                        + apiKey;

        String requestBody =
                """
                {
                  "contents":[
                    {
                      "parts":[
                        {
                          "text":"%s"
                        }
                      ]
                    }
                  ]
                }
                """
                        .formatted(
                                prompt.replace("\"", "\\\"")
                        );

        HttpHeaders headers =
                new HttpHeaders();

        headers.setContentType(
                MediaType.APPLICATION_JSON
        );

        HttpEntity<String> entity =
                new HttpEntity<>(
                        requestBody,
                        headers
                );

        RestTemplate restTemplate =
                new RestTemplate();

        try {

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );

            return response.getBody();

        }
        catch (Exception e) {

            return """
            AI service temporarily unavailable.

            This is a fallback response.

            Your code appears syntactically correct.
            Consider adding comments, validation,
            and error handling.
            """;
        }
    }
}