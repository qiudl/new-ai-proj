import organizationService from '../organizationService';

// Mock the api module used inside organizationService
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../api';

const mockedGet = api.get as jest.Mock;

describe('organizationService response parsing', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  test('getDepartments handles direct array response', async () => {
    const departments = [
      { id: 1, company_id: 2, name: 'A', level: 0, employee_count: 0, status: 'active', created_at: '', updated_at: '' },
      { id: 2, company_id: 2, name: 'B', level: 0, employee_count: 0, status: 'active', created_at: '', updated_at: '' },
    ];
    mockedGet.mockResolvedValueOnce(departments);

    const result = await organizationService.getDepartments(2);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('getDepartments handles {response: [...]} wrapper', async () => {
    const departments = [
      { id: 10, company_id: 2, name: 'Root', level: 0, employee_count: 0, status: 'active', created_at: '', updated_at: '' },
    ];
    mockedGet.mockResolvedValueOnce({ response: departments });

    const result = await organizationService.getDepartments(2);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(10);
  });

  test('getDepartments handles {success:true,data:[...]} wrapper', async () => {
    const departments = [
      { id: 20, company_id: 2, name: 'Root2', level: 0, employee_count: 0, status: 'active', created_at: '', updated_at: '' },
    ];
    mockedGet.mockResolvedValueOnce({ success: true, data: departments });

    const result = await organizationService.getDepartments(2);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(20);
  });

  test('getDepartments returns [] for invalid response', async () => {
    mockedGet.mockResolvedValueOnce({});

    const result = await organizationService.getDepartments(2);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  test('getDepartmentStats handles direct object response', async () => {
    mockedGet.mockResolvedValueOnce({
      totalDepartments: 3,
      totalEmployees: 42,
      maxLevel: 2,
      activeDepartments: 3,
    });

    const stats = await organizationService.getDepartmentStats(2);
    expect(stats).toEqual({
      totalDepartments: 3,
      totalEmployees: 42,
      maxLevel: 2,
      activeDepartments: 3,
    });
  });

  test('getDepartmentStats handles {data:{...}} wrapper', async () => {
    mockedGet.mockResolvedValueOnce({
      success: true,
      data: { totalDepartments: 1, totalEmployees: 10, maxLevel: 1, activeDepartments: 1 },
    });

    const stats = await organizationService.getDepartmentStats(2);
    expect(stats).toEqual({
      totalDepartments: 1,
      totalEmployees: 10,
      maxLevel: 1,
      activeDepartments: 1,
    });
  });

  test('getDepartmentStats returns defaults for invalid response', async () => {
    mockedGet.mockResolvedValueOnce(undefined as any);

    const stats = await organizationService.getDepartmentStats(2);
    expect(stats).toEqual({
      totalDepartments: 0,
      totalEmployees: 0,
      maxLevel: 0,
      activeDepartments: 0,
    });
  });
});

