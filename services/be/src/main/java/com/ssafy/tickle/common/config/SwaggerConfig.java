package com.ssafy.tickle.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        Server server = new Server();
        // Nginx 환경에서 무조건 HTTPS URL을 사용하도록 강제 설정
        server.setUrl("https://tickle-ticket.co.kr");
        
        return new OpenAPI()
                .servers(List.of(server));
    }
}
