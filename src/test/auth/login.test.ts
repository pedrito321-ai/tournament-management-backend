import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { createMockRequest } from '@/test/helpers/request';
import prisma from '@/libs/prisma';
import bcrypt from 'bcrypt';
import {
  mockAdminUser,
  mockInactiveUser,
} from '@/test/helpers/fixtures';

// Prisma and bcrypt are mocked globally in setup.ts
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Login', () => {
    it('should return 200 and token on successful login', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockAdminUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: mockAdminUser.email,
          user_password: 'correct-password',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBe('Login exitoso');
      expect(json.token).toBeDefined();
      expect(json.user).toBeDefined();
      expect(json.user.email).toBe(mockAdminUser.email);
      expect(json.user.role).toBe(mockAdminUser.role);
    });

    it('should return user data without password', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockAdminUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: mockAdminUser.email,
          user_password: 'correct-password',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.user.user_password).toBeUndefined();
      expect(json.user.id).toBe(mockAdminUser.id);
      expect(json.user.name).toBe(mockAdminUser.name);
      expect(json.user.lastName).toBe(mockAdminUser.lastName);
      expect(json.user.nickname).toBe(mockAdminUser.nickname);
    });
  });

  describe('User Not Found', () => {
    it('should return 404 when user does not exist', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'nonexistent@test.com',
          user_password: 'any-password',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Usuario no encontrado');
    });
  });

  describe('Invalid Password', () => {
    it('should return 401 when password is incorrect', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockAdminUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: mockAdminUser.email,
          user_password: 'wrong-password',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Contraseña incorrecta');
    });
  });

  describe('Inactive User (Blocked)', () => {
    it('should return 403 when user is inactive/blocked', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockInactiveUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: mockInactiveUser.email,
          user_password: 'correct-password',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe('Tu cuenta ha sido bloqueada. No puedes ingresar.');
    });

    it('should check is_active before validating password', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockInactiveUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: mockInactiveUser.email,
          user_password: 'any-password',
        },
      });

      await POST(request);

      // bcrypt.compare should NOT be called for inactive users
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('Server Error', () => {
    it('should return 500 on internal server error', async () => {
      vi.mocked(prisma.users.findUnique).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'any@test.com',
          user_password: 'any-password',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Error interno del servidor');
    });
  });

  describe('Database Calls', () => {
    it('should call prisma.users.findUnique with correct email', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      const testEmail = 'test@example.com';
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: testEmail,
          user_password: 'password',
        },
      });

      await POST(request);

      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: testEmail },
      });
    });
  });
});
