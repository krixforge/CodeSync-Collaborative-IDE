package com.krithi.chat_app.controller;

import com.krithi.chat_app.model.AIRequest;
import com.krithi.chat_app.model.AIResponse;
import com.krithi.chat_app.service.GeminiService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin("*")
public class AIController {
    private final GeminiService geminiService;

    public AIController(
            GeminiService geminiService) {

        this.geminiService =
                geminiService;
    }

    @PostMapping("/explain")
    public AIResponse explainCode(
            @RequestBody AIRequest request) {

        String response =
                geminiService.ask(
                        """
                        Explain this code:
    
                        %s
                        """
                                .formatted(
                                        request.getCode()
                                )
                );

        return new AIResponse(
                response
        );
    }

    @PostMapping("/bugs")
    public AIResponse findBugs(
            @RequestBody AIRequest request) {

        String response =
                geminiService.ask(
                        """
                        Find bugs in this code:
    
                        %s
                        """
                                .formatted(
                                        request.getCode()
                                )
                );

        return new AIResponse(
                response
        );
    }
    @PostMapping("/optimize")
    public AIResponse optimizeCode(
            @RequestBody AIRequest request) {

        String response =
                geminiService.ask(
                        """
                        Optimize this code:
    
                        %s
                        """
                                .formatted(
                                        request.getCode()
                                )
                );

        return new AIResponse(
                response
        );
    }

    @PostMapping("/tests")
    public AIResponse generateTests(
            @RequestBody AIRequest request) {

        String response =
                geminiService.ask(
                        """
                        Generate test cases for:
    
                        %s
                        """
                                .formatted(
                                        request.getCode()
                                )
                );

        return new AIResponse(
                response
        );
    }


}