package com.googol.browserintegration.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.socket.config.annotation.*;

/**
 * WebSocket configuration class for the browser integration application.
 * <p>
 * This class configures the WebSocket endpoints, message broker settings,
 * and CORS policies for the application's real-time communication features.
 * It enables bidirectional communication between clients and the server
 * using the STOMP protocol over WebSocket.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Registers the WebSocket endpoint that clients will use to connect to.
     * <p>
     * Configures the "/ws" endpoint with SockJS support and allows
     * connections from any origin for development purposes.
     *
     * @param registry The STOMP endpoint registry for WebSocket configuration
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    /**
     * Configures the message broker used for routing messages between clients and server.
     * <p>
     * Enables a simple in-memory message broker with destination prefixes:
     * - "/topic" for server-to-client broadcasts
     * - "/app" for client-to-server messages
     *
     * @param registry The message broker registry for channel configuration
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    /**
     * Configures CORS (Cross-Origin Resource Sharing) policies for the REST API.
     * <p>
     * Allows requests from the frontend running on localhost:8080 to
     * access the API endpoints with GET and POST methods.
     *
     * @param registry The CORS registry for configuring allowed origins and methods
     */
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:8080") // Frontend port
                .allowedMethods("GET", "POST");
    }
}