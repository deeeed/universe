export const mockGetItem = jest.fn();
export const mockSetItem = jest.fn();
export const mockRemoveItem = jest.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    clear: jest.fn(),
  },
  writable: true,
});
