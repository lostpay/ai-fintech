"""
Database configuration for connecting to React Native SQLite database
"""
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def find_react_native_database() -> str:
    """
    Find the React Native SQLite database file
    Returns the path to budget_tracker.db
    """
    
    # Priority 1: Environment variable (for production/explicit configuration)
    env_path = os.getenv("RN_DATABASE_PATH")
    if env_path:
        path = Path(env_path)
        if path.exists():
            logger.info(f"Using database from environment variable: {env_path}")
            return str(path)
        else:
            logger.warning(f"Database path from environment does not exist: {env_path}")
    
    # Priority 2: Common development locations
    base_dir = Path(__file__).parent.parent.parent  # Go up to /app directory
    
    development_paths = [
        # In app root
        base_dir / "budget_tracker.db",
        # In app/src directory  
        base_dir / "src" / "budget_tracker.db",
        # In app/app directory (Expo Router structure)
        base_dir / "app" / "budget_tracker.db",
        # One level up from app
        base_dir.parent / "budget_tracker.db",
    ]
    
    for path in development_paths:
        if path.exists():
            logger.info(f"Found React Native database at: {path}")
            return str(path)
    
    # Priority 3: System Expo SQLite locations (Windows)
    system_paths = [
        Path.home() / "AppData" / "Local" / "Expo" / "budget_tracker.db",
        Path.home() / "AppData" / "Roaming" / "Expo" / "budget_tracker.db", 
        Path.home() / ".expo" / "budget_tracker.db",
        # Common simulator paths
        Path.home() / "AppData" / "Local" / "Packages" / "Microsoft.WindowsSubsystemForLinux_8wekyb3d8bbwe" / "LocalState" / "rootfs" / "tmp" / "budget_tracker.db",
    ]
    
    for path in system_paths:
        if path.exists():
            logger.info(f"Found React Native database at system location: {path}")
            return str(path)
    
    # Priority 4: Create a development database path if nothing found
    fallback_path = base_dir / "budget_tracker.db"
    logger.warning(f"React Native database not found. Using fallback path: {fallback_path}")
    logger.warning("Make sure to:")
    logger.warning("1. Run the React Native app at least once to create the database")
    logger.warning("2. Set RN_DATABASE_PATH environment variable if database is in a custom location")
    
    return str(fallback_path)

def get_database_config() -> dict:
    """Get database configuration dictionary"""
    db_path = find_react_native_database()
    
    return {
        "database_path": db_path,
        "database_exists": Path(db_path).exists(),
        "timeout": 10.0,
        "check_same_thread": False,  # Allow multiple threads
        "enable_foreign_keys": True,
    }

def create_env_file_template():
    """Create a template .env file with database configuration"""
    env_path = Path(__file__).parent.parent / ".env"
    
    if not env_path.exists():
        template_content = """# AI PoC Configuration
# Database
RN_DATABASE_PATH=../budget_tracker.db

# HuggingFace API Key (required)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# Logging
LOG_LEVEL=INFO
"""
        with open(env_path, 'w') as f:
            f.write(template_content)
        
        logger.info(f"Created .env template at: {env_path}")
        return str(env_path)
    
    return str(env_path)

if __name__ == "__main__":
    # Test database detection
    logging.basicConfig(level=logging.INFO)
    
    print("Testing database configuration...")
    config = get_database_config()
    
    print(f"Database path: {config['database_path']}")
    print(f"Database exists: {config['database_exists']}")
    
    if not config['database_exists']:
        print("\n⚠️  Database not found!")
        print("To fix this:")
        print("1. Run the React Native app to create the database")
        print("2. Or set RN_DATABASE_PATH environment variable")
        print("3. Or copy an existing database to the expected location")
        
        # Create .env template
        env_file = create_env_file_template()
        print(f"4. Check the .env template created at: {env_file}")