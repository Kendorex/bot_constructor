
import sqlite3
from pathlib import Path
import logging
from typing import Optional, Dict, Any, List, Union
import json
import os
from datetime import datetime

logger = logging.getLogger(__name__)
DB_PATH = Path(__file__).parent / 'bot.db'

# SQLite type mapping
SQLITE_TYPE_MAP = {
    'TEXT': 'TEXT',
    'INTEGER': 'INTEGER',
    'REAL': 'REAL',
    'BLOB': 'BLOB',
    'NUMERIC': 'NUMERIC',
    'BOOLEAN': 'INTEGER',  # SQLite doesn't have native BOOLEAN, use INTEGER (0/1)
    'DATE': 'TEXT',        # Store as ISO format string (YYYY-MM-DD)
    'DATETIME': 'TEXT'     # Store as ISO format string (YYYY-MM-DD HH:MM:SS)
}

class BotDatabase:
    def __init__(self):
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()
        self.initialize_data()
    
    def create_tables(self):
        """Create tables with all required columns for user data"""
        cursor = self.conn.cursor()
        try:
            # Create users table with all Telegram user fields
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    language_code TEXT,
                    is_bot INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER REFERENCES users(user_id),
                    message_id INTEGER,
                    chat_id INTEGER,
                    text TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(user_id)
                )
            ''')
            
            # Create additional tables from config
            tables = []
            
            for table in tables:
                table_name = table.get('name')
                if not table_name:
                    continue
                
                # Skip if table already exists
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
                if cursor.fetchone():
                    continue
                
                # Create table with auto-increment ID
                columns = [
                    'id INTEGER PRIMARY KEY AUTOINCREMENT',
                    'user_id INTEGER REFERENCES users(user_id)'
                ]
                
                # Add custom columns with proper type mapping
                for col in table.get('columns', []):
                    col_name = col.get('name')
                    col_type = col.get('type', 'TEXT').upper()
                    if col_name:
                        # Map to SQLite type
                        sql_type = SQLITE_TYPE_MAP.get(col_type, 'TEXT')
                        columns.append(f"{col_name} {sql_type}")
                
                # Add timestamps
                columns.append('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
                columns.append('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
                columns_sql = ', '.join(columns)
                
                cursor.execute(f'CREATE TABLE IF NOT EXISTS {table_name} ({columns_sql})')
            
            self.conn.commit()
            logger.info("Tables created successfully")
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            self.conn.rollback()
            raise
    
    def initialize_data(self):
        """Initialize base data with proper type conversion"""
        cursor = self.conn.cursor()
        try:
            schema = {}
            
            for table_name, rows in schema.items():
                if not isinstance(rows, list):
                    continue
                
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
                if not cursor.fetchone():
                    continue
                
                # Get column types for this table
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = cursor.fetchall()
                column_types = {col[1]: col[2].upper() for col in columns_info}
                
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    
                    processed_row = {}
                    for col_name, value in row.items():
                        if col_name.lower() == 'id':
                            continue
                            
                        col_type = column_types.get(col_name)
                        if col_type:
                            # Convert values according to type
                            if col_type == 'INTEGER' and isinstance(value, bool):
                                processed_row[col_name] = int(value)
                            elif col_type in ('DATE', 'DATETIME') and isinstance(value, str):
                                # Just store as-is, validation should happen elsewhere
                                processed_row[col_name] = value
                            else:
                                processed_row[col_name] = value
                        else:
                            processed_row[col_name] = value
                    
                    if not processed_row:
                        continue
                    
                    columns = list(processed_row.keys())
                    query = f'''
                        INSERT INTO {table_name} ({", ".join(columns)}) 
                        VALUES ({", ".join(["?"] * len(columns))})
                    '''
                    cursor.execute(query, list(processed_row.values()))
            
            self.conn.commit()
        except Exception as e:
            logger.error(f"Error initializing data: {e}")
            self.conn.rollback()
    
    def save_user_data(self, user_id: int, table_name: str, data: dict) -> bool:
        """Save user data to database with proper error handling"""
        try:
            cursor = self.conn.cursor()
            
            if table_name == 'users':
                # Prepare user data
                username = data.get('username')
                first_name = data.get('first_name', '')
                last_name = data.get('last_name')
                language_code = data.get('language_code', '')
                is_bot = int(data.get('is_bot', False))

                logger.debug(f"Saving user data: user_id={user_id}, username={username}")

                # Check if user exists
                cursor.execute("SELECT 1 FROM users WHERE user_id = ?", (user_id,))
                user_exists = cursor.fetchone()

                if user_exists:
                    # Update existing user
                    cursor.execute('''
                        UPDATE users SET 
                            username = ?,
                            first_name = ?,
                            last_name = ?,
                            language_code = ?,
                            is_bot = ?,
                            last_active = CURRENT_TIMESTAMP
                        WHERE user_id = ?
                    ''', (
                        username if username else None,
                        first_name if first_name else None,
                        last_name if last_name else None,
                        language_code if language_code else None,
                        is_bot,
                        user_id
                    ))
                else:
                    # Insert new user
                    cursor.execute('''
                        INSERT INTO users (
                            user_id, username, first_name, last_name, 
                            language_code, is_bot, first_seen, last_active
                        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', (
                        user_id,
                        username if username else None,
                        first_name if first_name else None,
                        last_name if last_name else None,
                        language_code if language_code else None,
                        is_bot
                    ))
                
                self.conn.commit()
                logger.debug("User data saved successfully")
                return True
            
            # For other tables
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            if not columns_info:
                logger.error(f"Table {table_name} not found")
                return False
            
            # Prepare data without ID
            data_to_save = {k: v for k, v in data.items() if k.lower() != 'id'}
            data_to_save['user_id'] = user_id
            
            # Get column names and types
            columns = [col[1] for col in columns_info if col[1].lower() != 'id']
            column_types = {col[1]: col[2].upper() for col in columns_info}
            
            # Prepare values with proper type conversion
            values = []
            for col in columns:
                value = data_to_save.get(col)
                
                if value is None:
                    values.append(None)
                    continue
                    
                col_type = column_types.get(col, 'TEXT')
                
                if col_type == 'INTEGER' and isinstance(value, bool):
                    values.append(int(value))
                elif col_type in ('DATE', 'DATETIME') and isinstance(value, str):
                    values.append(value)
                else:
                    values.append(value)
            
            # Build and execute query
            columns_str = ', '.join(columns)
            placeholders = ', '.join(['?'] * len(columns))
            
            query = f'''
                INSERT INTO {table_name} ({columns_str})
                VALUES ({placeholders})
            '''
            
            cursor.execute(query, values)
            self.conn.commit()
            return True
            
        except sqlite3.Error as e:
            logger.error(f"Database error in save_user_data: {e}")
            self.conn.rollback()
            return False
        except Exception as e:
            logger.error(f"Unexpected error in save_user_data: {e}")
            self.conn.rollback()
            return False
    
    def get_user_data(self, user_id: int, table_name: str, limit: int = None) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
            cursor = self.conn.cursor()
            if table_name == 'users':
                query = f"SELECT * FROM {table_name} WHERE user_id = ?"
                params = (user_id,)
            else:
                query = f"SELECT * FROM {table_name} WHERE user_id = ? ORDER BY created_at DESC"
                params = (user_id,)
            
            if limit:
                query += f" LIMIT ?"
                params = (*params, limit)
            
            cursor.execute(query, params)
            
            if limit == 1:
                row = cursor.fetchone()
                return dict(row) if row else None
            return [dict(row) for row in cursor.fetchall()]
    
    def delete_record(self, table_name: str, record_id: int) -> bool:
        """Delete record by ID"""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                f"DELETE FROM {table_name} WHERE id = ?",
                (record_id,)
            )
            self.conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"DB error deleting record: {e}")
            self.conn.rollback()
            return False
    
    def close(self):
        """Close DB connection"""
        self.conn.close()

# Initialize database instance
db = BotDatabase()
