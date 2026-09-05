package com.comioko.common.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import com.comioko.common.exception.BusinessException;
import com.comioko.common.exception.ErrorCode;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 业务异常统一返回：HTTP 400。
     *
     * @param ex 业务异常，包含错误码与消息。
     * @return 响应体：code/message。
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", ex.getErrorCode().getCode());
        body.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(body);
    }

    /**
     * 参数校验失败（@Valid）统一返回：HTTP 400。
     * 仅取首个字段错误的信息作为提示。
     *
     * @param ex Spring 的方法参数校验异常。
     * @return 响应体：code/message。
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse(ErrorCode.BAD_REQUEST.getDefaultMessage());
        Map<String, Object> body = new HashMap<>();
        body.put("code", ErrorCode.BAD_REQUEST.getCode());
        body.put("message", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * 约束校验失败（如 @Validated 参数）统一返回：HTTP 400。
     *
     * @param ex 参数约束异常。
     * @return 响应体：code/message。
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", ErrorCode.BAD_REQUEST.getCode());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * 静态资源 / 路由都不存在：HTTP 404。
     *
     * 处理 EventSource（Accept: text/event-stream）这类客户端：
     * - 普通 application/json 请求：返回标准 JSON 错误体
     * - text/event-stream 请求（如 SSE EventSource）：返回空 body 404 + text/event-stream
     *   兼容的 Content-Type（避免 HttpMediaTypeNotAcceptableException → 500）
     *
     * EventSource（浏览器原生 API）无法接收 application/json 响应（会被当成连接错误），
     * 所以这种客户端必须返回空 body + 正确的 Content-Type。
     *
     * @param ex 资源未找到异常。
     * @param request HTTP 请求（用于判断 Accept 头）。
     * @return 404 响应。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        boolean wantsEventStream = accept != null && accept.contains("text/event-stream");

        if (wantsEventStream) {
            // SSE 客户端：返回空 body + text/event-stream Content-Type
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.TEXT_EVENT_STREAM)
                    .build();
        }

        // 普通请求：返回标准 JSON 错误体
        Map<String, Object> body = new HashMap<>();
        body.put("code", "NOT_FOUND");
        body.put("message", "资源不存在或功能未启用");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    /**
     * 客户端 Accept 头不被支持（如 SSE 客户端请求非流式端点）：HTTP 406。
     *
     * 默认行为：Spring 会抛出 HttpMediaTypeNotAcceptableException，被 @ExceptionHandler(Exception.class)
     * 捕获返回 500。覆盖为 406 让客户端明确知道是请求格式问题。
     *
     * @param ex 请求媒体类型不被接受异常。
     * @return 406 响应。
     */
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<Map<String, Object>> handleNotAcceptable(HttpMediaTypeNotAcceptableException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "NOT_ACCEPTABLE");
        body.put("message", "请求的 Accept 类型不被支持");
        return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).body(body);
    }

    /**
     * 客户端请求方法不被支持（如 OPTIONS 但服务端不允许）：HTTP 405。
     *
     * @param ex 请求方法不被支持异常。
     * @return 405 响应。
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotAllowed(HttpMediaTypeNotSupportedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", "METHOD_NOT_ALLOWED");
        body.put("message", "请求方法或媒体类型不被支持");
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(body);
    }

    /**
     * 未处理异常统一返回：HTTP 500。
     * 记录错误日志并返回通用提示。
     *
     * @param ex 未捕获的异常。
     * @return 响应体：code/message。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        Map<String, Object> body = new HashMap<>();
        body.put("code", "INTERNAL_ERROR");
        body.put("message", "服务异常，请稍后重试");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}

