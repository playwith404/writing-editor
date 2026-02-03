package store.pjcloud.cowrite.core.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AuthService;
import store.pjcloud.cowrite.core.service.AuthService.SessionInfo;
import store.pjcloud.cowrite.core.service.AuthService.SessionMeta;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public Object register(@RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        return authService.register(request.email(), request.name(), request.password(), request.avatarUrl(), extractMeta(httpRequest));
    }

    @PostMapping("/login")
    public Object login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request.email(), request.password(), extractMeta(httpRequest));
    }

    @PostMapping("/refresh")
    public Object refresh(@RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/verify-email")
    public Object verifyEmail(@RequestBody TokenRequest request) {
        return authService.verifyEmail(request.token());
    }

    @PostMapping("/resend-verification")
    public Object resendVerification(@RequestBody EmailRequest request) {
        return authService.resendVerification(request.email());
    }

    @PostMapping("/request-password-reset")
    public Object requestPasswordReset(@RequestBody EmailRequest request) {
        return authService.requestPasswordReset(request.email());
    }

    @PostMapping("/reset-password")
    public Object resetPassword(@RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request.token(), request.newPassword());
    }

    @PostMapping("/confirm-email-change")
    public Object confirmEmailChange(@RequestBody TokenRequest request) {
        return authService.confirmEmailChange(request.token());
    }

    @PostMapping("/logout")
    public Object logout() {
        UUID userId = SecurityUtils.requireUserId();
        return authService.logout(userId);
    }

    @GetMapping("/me")
    public Object me() {
        UUID userId = SecurityUtils.requireUserId();
        return authService.me(userId);
    }

    @PatchMapping("/me")
    public Object updateMe(@RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        return authService.updateProfile(userId, request.name(), request.avatarUrl());
    }

    @GetMapping("/sessions")
    public Object sessions() {
        UUID userId = SecurityUtils.requireUserId();
        return authService.listSessions(userId);
    }

    @DeleteMapping("/sessions/{id}")
    public Object revokeSession(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return authService.revokeSession(userId, id);
    }

    @PostMapping("/change-password")
    public Object changePassword(@RequestBody ChangePasswordRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        return authService.changePassword(userId, request.currentPassword(), request.newPassword());
    }

    @PostMapping("/request-email-change")
    public Object requestEmailChange(@RequestBody RequestEmailChangeRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        return authService.requestEmailChange(userId, request.newEmail());
    }

    @PostMapping("/delete-account")
    public Object deleteAccount(@RequestBody DeleteAccountRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        return authService.deleteAccount(userId, request.password());
    }

    private SessionMeta extractMeta(HttpServletRequest request) {
        String userAgent = request.getHeader("user-agent");
        String forwarded = request.getHeader("x-forwarded-for");
        String ipAddress = forwarded != null ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
        return new SessionMeta(userAgent, ipAddress);
    }

    public record RegisterRequest(String email, String name, String password, String avatarUrl) {}
    public record LoginRequest(String email, String password) {}
    public record RefreshRequest(String refreshToken) {}
    public record TokenRequest(String token) {}
    public record EmailRequest(String email) {}
    public record ResetPasswordRequest(String token, String newPassword) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}
    public record RequestEmailChangeRequest(String newEmail) {}
    public record UpdateProfileRequest(String name, String avatarUrl) {}
    public record DeleteAccountRequest(String password) {}
}
