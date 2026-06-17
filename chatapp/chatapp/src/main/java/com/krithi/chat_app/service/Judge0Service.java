package com.krithi.chat_app.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.krithi.chat_app.model.Judge0Request;

@Service
public class Judge0Service {

    public String runCode(
            String code,
            Integer languageId
    ) {

        try {

            String url =
                    "https://ce.judge0.com/submissions/?base64_encoded=false&wait=true";



            HttpHeaders headers =
                    new HttpHeaders();

            headers.setContentType(
                    MediaType.APPLICATION_JSON
            );

            Judge0Request request =
                    new Judge0Request(
                            code,
                            languageId
                    );

            HttpEntity<Judge0Request> entity =
                    new HttpEntity<>(
                            request,
                            headers
                    );

            RestTemplate restTemplate =
                    new RestTemplate();

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            url,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );
            System.out.println(
                    response.getBody()
            );
            return response.getBody();

        } catch (Exception e) {

            return e.getMessage();
        }
    }
}