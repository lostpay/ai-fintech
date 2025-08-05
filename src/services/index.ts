// Services barrel export
import { DatabaseService } from './DatabaseService';

// Create a singleton instance of DatabaseService
export const databaseService = new DatabaseService();

// Export the service class as well for testing
export { DatabaseService };
