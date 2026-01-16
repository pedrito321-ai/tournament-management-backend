import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/signup/route';
import { createMockRequest } from '@/test/helpers/request';
import prisma from '@/libs/prisma';

// Mock the service and validation functions
vi.mock('@/service/users', () => ({
  createUser: vi.fn().mockResolvedValue({
    id: 100,
    name: 'New',
    lastName: 'User',
    age: 25,
    nickname: 'new_user',
    email: 'new@test.com',
    role: 'competitor',
  }),
}));

vi.mock('@/libs/user/validateRol', () => ({
  validateRol: vi.fn().mockResolvedValue(null),
}));

import { createUser } from '@/service/users';
import { validateRol } from '@/libs/user/validateRol';

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
    vi.mocked(validateRol).mockResolvedValue(null);
  });

  const validSignupData = {
    name: 'New',
    lastName: 'User',
    age: 25,
    nickname: 'new_user',
    email: 'new@test.com',
    user_password: 'Password123!',
    role: 'competitor',
    club_id: 1,
    dni: '12345678',
  };

  describe('Successful Signup', () => {
    it('should return 201 and token on successful signup', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.message).toBe('Usuario registrado exitosamente');
      expect(json.token).toBeDefined();
      expect(json.user).toBeDefined();
    });

    it('should call createUser with correct data', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      await POST(request);

      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validSignupData.name,
          lastName: validSignupData.lastName,
          email: validSignupData.email,
          nickname: validSignupData.nickname,
          role: validSignupData.role,
        })
      );
    });

    it('should hash password before creating user', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      await POST(request);

      // The createUser should receive a hashed password, not the plain one
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_password: expect.not.stringMatching(validSignupData.user_password),
        })
      );
    });
  });

  describe('Duplicate Email', () => {
    it('should return 409 when email already exists', async () => {
      // First call for nickname (not found), second call for email (found)
      vi.mocked(prisma.users.findUnique)
        .mockResolvedValueOnce(null) // nickname check - not found
        .mockResolvedValueOnce({ id: 1, email: validSignupData.email } as never); // email check - found

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.error).toBe('El email ya está en uso');
    });
  });

  describe('Duplicate Nickname', () => {
    it('should return 409 when nickname already exists', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValueOnce({
        id: 1,
        nickname: validSignupData.nickname,
      } as never);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.error).toBe('El nickname ya está en uso');
    });
  });

  describe('Invalid Data (Validation)', () => {
    it('should return 400 when required fields are missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          email: 'test@test.com',
          // Missing other required fields
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errors).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          ...validSignupData,
          email: 'invalid-email',
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errors).toBeDefined();
    });
  });

  describe('Role Validation', () => {
    it('should return error when role validation fails', async () => {
      vi.mocked(validateRol).mockResolvedValue({
        error: 'El club especificado no existe',
        status: 400,
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: {
          ...validSignupData,
          club_id: 999,
        },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('El club especificado no existe');
    });
  });

  describe('Server Error', () => {
    it('should return 500 on unexpected error', async () => {
      vi.mocked(createUser).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Error interno del servidor');
    });
  });

  describe('Security', () => {
    it('should not return password in response', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signup',
        body: validSignupData,
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.user.user_password).toBeUndefined();
      expect(json.user.password).toBeUndefined();
    });
  });
});
