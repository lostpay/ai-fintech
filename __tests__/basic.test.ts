// Basic test to verify Jest setup
describe('Basic Test Suite', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should validate TypeScript compilation', () => {
    const greeting: string = 'Hello, World!';
    expect(greeting).toBe('Hello, World!');
  });
});
