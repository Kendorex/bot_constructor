import tempfile
import os
import shutil
import sqlite3
import logging
from pathlib import Path
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
import threading
import logging
from .models import TelegramBot
from .serializers import  TelegramBotSerializer
from .bot_runner import BotRunner, BotGenerator, DBGenerator, running_bots

logger = logging.getLogger(__name__)

class TelegramBotViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Telegram bots to be viewed or edited.
    Includes special actions for managing bot lifecycle and database operations.
    """
    queryset = TelegramBot.objects.all()
    serializer_class = TelegramBotSerializer


    # В классе TelegramBotViewSet добавим/изменим метод create

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        
        try:
            # Используем метод create_bot модели для создания бота с проверкой в Telegram
            bot = TelegramBot.create_bot(token)
            
            # Возвращаем данные созданного бота
            headers = self.get_success_headers(serializer.data)
            return Response(
                TelegramBotSerializer(bot).data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to create bot: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_bot_db_path(self, bot):
        """Helper method to get bot's database path"""
        bot_dir = Path(settings.BASE_DIR) / 'telegram_bots' / f'bot_{bot.id}'
        bot_dir.mkdir(parents=True, exist_ok=True)  # Ensure directory exists
        return bot_dir / 'bot.db'

    def get_db_connection(self, db_path):
        """Helper method to get database connection with proper settings"""
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        return conn

    @action(detail=True, methods=['get'], url_path='users')
    def get_bot_users(self, request, pk=None):
        """Get list of users who interacted with the bot"""
        bot = self.get_object()
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                logger.error(f"Database file not found at {db_path}")
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            search_term = request.query_params.get('search', '').strip()
            offset = (page - 1) * page_size
            
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                # Check if users table exists
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='users'
                """)
                
                if not cursor.fetchone():
                    logger.error("Users table not found in database")
                    return Response({
                        'users': [],
                        'total_count': 0
                    })
                
                # Base query for users - simplified for debugging
                query = """
                    SELECT 
                        user_id as id, 
                        username, 
                        first_name, 
                        last_name, 
                        language_code,
                        first_seen,
                        last_active
                    FROM users
                """
                
                # Add search conditions if search term provided
                params = []
                if search_term:
                    query += """
                        WHERE username LIKE ? OR 
                        first_name LIKE ? OR 
                        last_name LIKE ? OR 
                        user_id = ?
                    """
                    search_param = f"%{search_term}%"
                    params.extend([search_param, search_param, search_param])
                    try:
                        # Try to convert search term to user_id if it's numeric
                        user_id = int(search_term)
                        params.append(user_id)
                    except ValueError:
                        params.append(-1)  # Will never match
                
                # Add pagination
                query += """
                    ORDER BY last_active DESC
                    LIMIT ? OFFSET ?
                """
                params.extend([page_size, offset])
                
                # Execute query
                cursor.execute(query, params)
                users = [dict(row) for row in cursor.fetchall()]
                
                # Get total count
                count_query = "SELECT COUNT(*) FROM users"
                if search_term:
                    count_query += """
                        WHERE username LIKE ? OR 
                        first_name LIKE ? OR 
                        last_name LIKE ? OR 
                        user_id = ?
                    """
                    cursor.execute(count_query, params[:-2])  # Exclude pagination params
                else:
                    cursor.execute(count_query)
                
                total_count = cursor.fetchone()[0]
                
                return Response({
                    'users': users,
                    'total_count': total_count
                })
                    
        except Exception as e:
            logger.error(f"Error getting users for bot {bot.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Server error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start the bot with the given ID"""
        bot = self.get_object()
        
        if bot.token in running_bots:
            return Response(
                {'status': 'Bot already running'},
                status=status.HTTP_200_OK
            )
        
        try:
            # Generate required files
            BotGenerator(bot).create_bot_file()
            DBGenerator(bot).create_db_file()
            
            # Start bot in a separate thread
            runner = BotRunner(bot)
            thread = threading.Thread(
                target=runner.run_bot,
                daemon=True
            )
            thread.start()
            
            # Update bot status
            bot.is_active = True
            bot.save()
            
            return Response(
                {'status': 'Bot started successfully'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error starting bot {bot.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Failed to start bot: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):
        """Stop the running bot"""
        bot = self.get_object()
        
        if bot.token not in running_bots:
            return Response(
                {'status': 'Bot is not running'},
                status=status.HTTP_200_OK
            )
        
        try:
            runner = BotRunner(bot)
            if runner.stop_bot():
                bot.is_active = False
                bot.save()
                return Response({'status': 'Bot stopped successfully'})
            return Response(
                {'error': 'Failed to stop bot'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error stopping bot {bot.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Failed to stop bot: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='tables')
    def get_bot_tables(self, request, pk=None):
        """Get list of all tables in bot's database"""
        bot = self.get_object()
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                # Get tables list excluding system tables
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    ORDER BY name
                """)
                tables = [row[0] for row in cursor.fetchall()]
                
                # Get detailed schema for each table
                tables_with_schema = []
                for table in tables:
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [{
                        'name': col[1], 
                        'type': col[2],
                        'notnull': bool(col[3]),
                        'pk': bool(col[5])
                    } for col in cursor.fetchall()]
                    
                    tables_with_schema.append({
                        'name': table,
                        'columns': columns,
                        'row_count': self._get_table_row_count(cursor, table)
                    })
                
                return Response({
                    'tables': tables_with_schema,
                    'database': str(db_path)
                })
                
        except Exception as e:
            logger.error(f"Error getting tables for bot {bot.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Database error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_table_row_count(self, cursor, table_name):
        """Helper method to get row count for a table"""
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cursor.fetchone()[0]

    @action(detail=True, methods=['get'], url_path='tables/(?P<table_name>[^/.]+)')
    def get_table_data(self, request, table_name, pk=None):
        """Get data from specific table with pagination support"""
        bot = self.get_object()
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 100))
            offset = (page - 1) * page_size
            
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                # Verify table exists
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name=?
                """, (table_name,))
                
                if not cursor.fetchone():
                    return Response(
                        {'error': f'Table {table_name} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Get paginated data
                cursor.execute(f"""
                    SELECT *, rowid FROM {table_name}
                    LIMIT ? OFFSET ?
                """, (page_size, offset))
                
                rows = cursor.fetchall()
                data = [dict(row) for row in rows]
                
                # Get total count for pagination
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                total_count = cursor.fetchone()[0]
                
                # Get column info
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [{
                    'name': col[1], 
                    'type': col[2],
                    'notnull': bool(col[3]),
                    'pk': bool(col[5])
                } for col in cursor.fetchall()]
                
                return Response({
                    'data': data,
                    'columns': columns,
                    'table': table_name,
                    'pagination': {
                        'page': page,
                        'page_size': page_size,
                        'total_count': total_count,
                        'total_pages': (total_count + page_size - 1) // page_size
                    }
                })
                
        except Exception as e:
            logger.error(f"Error getting table data for {table_name}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Database error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='tables/(?P<table_name>[^/.]+)/save')
    def save_table_data(self, request, table_name, pk=None):
        """Save data to specific table (insert/update/delete operations)"""
        bot = self.get_object()
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            data = request.data
            if not isinstance(data, list):
                return Response(
                    {'error': 'Data should be an array of rows'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                # Get table structure
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = {col[1]: col for col in cursor.fetchall()}
                column_names = columns_info.keys()
                
                # Process each row operation
                operations = {'insert': 0, 'update': 0, 'delete': 0}
                
                for row in data:
                    try:
                        if row.get('_delete'):
                            # Delete operation
                            if 'rowid' in row:
                                cursor.execute(
                                    f"DELETE FROM {table_name} WHERE rowid=?",
                                    (row['rowid'],))
                                operations['delete'] += 1
                        elif 'rowid' in row:
                            # Update operation
                            rowid = row.pop('rowid')
                            valid_cols = {
                                k: v for k, v in row.items() 
                                if k in column_names
                            }
                            
                            if valid_cols:
                                set_clause = ', '.join([
                                    f"{k}=?" for k in valid_cols.keys()
                                ])
                                values = list(valid_cols.values()) + [rowid]
                                
                                cursor.execute(
                                    f"UPDATE {table_name} SET {set_clause} WHERE rowid=?",
                                    values
                                )
                                operations['update'] += 1
                        else:
                            # Insert operation
                            valid_cols = {
                                k: v for k, v in row.items() 
                                if k in column_names
                            }
                            
                            if valid_cols:
                                cols = ', '.join(valid_cols.keys())
                                placeholders = ', '.join(['?'] * len(valid_cols))
                                
                                cursor.execute(
                                    f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})",
                                    list(valid_cols.values())
                                )
                                operations['insert'] += 1
                    except sqlite3.Error as e:
                        conn.rollback()
                        logger.error(f"Error processing row: {row}. Error: {str(e)}")
                        return Response(
                            {'error': f"Failed to process row: {str(e)}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                conn.commit()
                return Response({
                    'status': 'success',
                    'operations': operations
                })
                
        except Exception as e:
            logger.error(f"Error saving data to {table_name}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Database error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='tables/(?P<table_name>[^/.]+)/truncate')
    def truncate_table(self, request, table_name, pk=None):
        """Truncate (empty) a table"""
        bot = self.get_object()
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                # Verify table exists
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name=?
                """, (table_name,))
                
                if not cursor.fetchone():
                    return Response(
                        {'error': f'Table {table_name} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Truncate table
                cursor.execute(f"DELETE FROM {table_name}")
                cursor.execute("VACUUM")
                conn.commit()
                
                return Response({
                    'status': 'success',
                    'message': f'Table {table_name} truncated'
                })
                
        except Exception as e:
            logger.error(f"Error truncating table {table_name}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Database error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['delete'], url_path='tables/(?P<table_name>[^/.]+)/delete')
    def delete_table(self, request, table_name, pk=None):
        """Delete a table from the database"""
        bot = self.get_object()
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                # Verify table exists
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name=?
                """, (table_name,))
                
                if not cursor.fetchone():
                    return Response(
                        {'error': f'Table {table_name} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Drop table
                cursor.execute(f"DROP TABLE {table_name}")
                cursor.execute("VACUUM")
                conn.commit()
                
                return Response({
                    'status': 'success',
                    'message': f'Table {table_name} deleted'
                })
                
        except Exception as e:
            logger.error(f"Error deleting table {table_name}: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Database error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='execute-sql')
    def execute_sql(self, request, pk=None):
        """Execute raw SQL query (for admin purposes)"""
        bot = self.get_object()
        sql = request.data.get('sql')
        
        if not sql:
            return Response(
                {'error': 'SQL query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent potentially dangerous operations
        sql_lower = sql.lower()
        if any(cmd in sql_lower for cmd in ['drop', 'alter', 'attach', 'detach', 'create']):
            return Response(
                {'error': 'This operation is not allowed'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            db_path = self.get_bot_db_path(bot)
            
            if not db_path.exists():
                return Response(
                    {'error': 'Database not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            with self.get_db_connection(db_path) as conn:
                cursor = conn.cursor()
                
                try:
                    cursor.execute(sql)
                    
                    if sql.strip().lower().startswith('select'):
                        # For SELECT queries, return the results
                        columns = [col[0] for col in cursor.description] if cursor.description else []
                        rows = cursor.fetchall()
                        data = [dict(zip(columns, row)) for row in rows]
                        
                        return Response({
                            'status': 'success',
                            'data': data,
                            'columns': columns
                        })
                    else:
                        # For other queries, return affected rows count
                        conn.commit()
                        return Response({
                            'status': 'success',
                            'rows_affected': cursor.rowcount
                        })
                        
                except sqlite3.Error as e:
                    conn.rollback()
                    return Response(
                        {'error': f"SQL error: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
        except Exception as e:
            logger.error(f"Error executing SQL: {str(e)}", exc_info=True)
            return Response(
                {'error': f"Database error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    @action(detail=True, methods=['post'])
    def import_database(self, request, pk=None):
        bot = self.get_object()
        
        if 'db_file' not in request.FILES:
            return Response(
                {'error': 'Файл базы данных не предоставлен'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        db_file = request.FILES['db_file']
        
        # Проверка расширения файла
        allowed_extensions = ['.db', '.sqlite', '.sqlite3']
        if not any(db_file.name.lower().endswith(ext) for ext in allowed_extensions):
            return Response(
                {'error': 'Неподдерживаемый тип файла. Разрешены только файлы SQLite (.db, .sqlite, .sqlite3)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tmp_path = None
        try:
            # Сохраняем временный файл
            with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
                for chunk in db_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name
            
            # Анализируем структуру базы данных
            db_generator = DBGenerator(bot)
            db_analysis = db_generator.import_database(tmp_path)
            
            # Обновляем конфигурацию бота
            if 'dbConfig' not in bot.config:
                bot.config['dbConfig'] = {}
                
            bot.config['dbConfig'].update({
                'tables': db_analysis['tables'],
                'schema': db_analysis['schema']
            })
            bot.save()
            
            # Создаем директорию для бота, если не существует
            bot_dir = Path(settings.BASE_DIR) / 'telegram_bots' / f'bot_{bot.id}'
            bot_dir.mkdir(parents=True, exist_ok=True)
            
            # Копируем импортированную базу данных
            destination_db = bot_dir / 'bot.db'
            shutil.copy2(tmp_path, destination_db)
            
            # Генерируем файл для работы с БД
            db_generator.create_db_file(tmp_path)
            
            return Response({
                'message': 'База данных успешно импортирована',
                'tables': db_analysis['tables'],
                'schema': db_analysis['schema']
            })
            
        except sqlite3.Error as e:
            logger.error(f"Ошибка SQLite при импорте БД: {str(e)}")
            return Response(
                {'error': f'Ошибка в файле базы данных: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Ошибка при импорте базы данных: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Ошибка при обработке файла: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # Удаляем временный файл, если он существует
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    logger.error(f"Ошибка при удалении временного файла: {str(e)}")