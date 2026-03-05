import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asaasService } from '../asaasService';
import { api } from '../api';

// Mock da API
vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('AsaasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create a checkout', async () => {
    const mockCheckoutData = {
      ticketId: 'ticket-123',
      quantity: 1,
      buyerName: 'Test Buyer',
      buyerEmail: 'test@example.com',
      buyerCpf: '123.456.789-00',
      paymentMethod: 'PIX',
    };
    const mockResponse = { checkoutUrl: 'https://asaas.com/checkout/123' };

    (api.post as vi.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await asaasService.createCheckout(mockCheckoutData);

    expect(api.post).toHaveBeenCalledWith('/api/payments/checkout', mockCheckoutData);
    expect(result).toEqual({ data: mockResponse });
  });

  it('should handle error when creating a checkout', async () => {
    const mockCheckoutData = {
      ticketId: 'ticket-123',
      quantity: 1,
      buyerName: 'Test Buyer',
      buyerEmail: 'test@example.com',
      buyerCpf: '123.456.789-00',
      paymentMethod: 'PIX',
    };
    const mockError = new Error('Failed to create checkout');

    (api.post as vi.Mock).mockRejectedValueOnce(mockError);

    await expect(asaasService.createCheckout(mockCheckoutData)).rejects.toThrow('Failed to create checkout');
    expect(api.post).toHaveBeenCalledWith('/api/payments/checkout', mockCheckoutData);
  });

  it('should successfully register an organizer', async () => {
    const mockOrganizerData = {
      name: 'Test Organizer',
      email: 'organizer@example.com',
      password: 'password123',
      cpfCnpj: '11.222.333/0001-44',
      mobilePhone: '11987654321',
    };
    const mockResponse = { organizerId: 'org-456', message: 'Organizer registered successfully' };

    (api.post as vi.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await asaasService.registerOrganizer(mockOrganizerData);

    expect(api.post).toHaveBeenCalledWith('/api/organizers/register', mockOrganizerData);
    expect(result).toEqual({ data: mockResponse });
  });

  it('should handle error when registering an organizer', async () => {
    const mockOrganizerData = {
      name: 'Test Organizer',
      email: 'organizer@example.com',
      password: 'password123',
      cpfCnpj: '11.222.333/0001-44',
      mobilePhone: '11987654321',
    };
    const mockError = new Error('Failed to register organizer');

    (api.post as vi.Mock).mockRejectedValueOnce(mockError);

    await expect(asaasService.registerOrganizer(mockOrganizerData)).rejects.toThrow('Failed to register organizer');
    expect(api.post).toHaveBeenCalledWith('/api/organizers/register', mockOrganizerData);
  });
});
