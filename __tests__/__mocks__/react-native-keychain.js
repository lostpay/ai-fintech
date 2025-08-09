export const getGenericCredential = jest.fn().mockResolvedValue({
  password: 'mock_api_key',
});

export const setGenericCredential = jest.fn().mockResolvedValue(true);

export default {
  getGenericCredential,
  setGenericCredential,
};