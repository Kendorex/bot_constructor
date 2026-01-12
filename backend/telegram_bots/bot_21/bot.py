
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardMarkup, InlineKeyboardButton,
    InputFile, FSInputFile, ReplyKeyboardRemove
)
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder
import logging
import asyncio
import os
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import pytz

# Enhanced logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logging.getLogger('apscheduler').setLevel(logging.DEBUG)
true=True
false=False
null=None
from .bot_database import db

# Constants
MAX_RECURSION_DEPTH = 10

# Bot and dispatcher initialization
bot = Bot(token='...')
dp = Dispatcher()

# Scheduler for broadcasts
scheduler = AsyncIOScheduler(timezone=pytz.UTC)

# User states storage
user_states: Dict[int, Dict] = {}

# Bot configuration
config = {
    "commands": [
        {
            "name": "/start",
            "description": ""
        }
    ],
    "nodes": [
        {
            "id": "broadcast-1747126529589",
            "type": "broadcast",
            "position": {
                "x": 236.46351800211949,
                "y": 464.5916005771642
            },
            "data": {
                "commands": [
                    "/start"
                ],
                "delay": "0",
                "customDelay": "",
                "broadcastTime": "08:59",
                "frequency": "daily",
                "target": "all"
            },
            "sourcePosition": "right",
            "targetPosition": "left",
            "width": 224,
            "height": 243,
            "selected": true,
            "positionAbsolute": {
                "x": 236.46351800211949,
                "y": 464.5916005771642
            },
            "dragging": false
        },
        {
            "id": "text-1747126534987",
            "type": "text",
            "position": {
                "x": 658.7740599619698,
                "y": 440.4047604727043
            },
            "data": {
                "commands": [
                    "/start"
                ],
                "delay": "0",
                "customDelay": "",
                "text": "qwerrrr"
            },
            "sourcePosition": "right",
            "targetPosition": "left",
            "width": 282,
            "height": 255,
            "selected": false,
            "positionAbsolute": {
                "x": 658.7740599619698,
                "y": 440.4047604727043
            },
            "dragging": false
        }
    ],
    "edges": [
        {
            "source": "broadcast-1747126529589",
            "sourceHandle": "broadcast-1747126529589-source",
            "target": "text-1747126534987",
            "targetHandle": null,
            "markerEnd": {
                "type": "arrowclosed"
            },
            "style": {
                "strokeWidth": 2
            },
            "type": "default",
            "id": "reactflow__edge-broadcast-1747126529589broadcast-1747126529589-source-text-1747126534987"
        }
    ],
    "viewport": {
        "x": -228.33030378447063,
        "y": -253.74217311281507,
        "zoom": 1.1345718422264675
    },
    "activeCommand": "/start",
    "dbConfig": {
        "tables": [],
        "schema": {}
    },
    "selected_schema": "custom"
}

async def broadcast_broadcast_1747126529589():
    """Broadcast task for node broadcast-1747126529589"""
    try:
        logger.info(f"⏰ Starting broadcast task for node broadcast-1747126529589 at {datetime.now()}")
        
        # Get target users based on criteria
        cursor = db.conn.cursor()
        
        if 'all' == 'all':
            cursor.execute("SELECT user_id FROM users")
        elif 'all' == 'active':
            cursor.execute("""
                SELECT user_id FROM users 
                WHERE last_active > datetime('now', '-7 days')
            """)
        elif 'all' == 'inactive':
            cursor.execute("""
                SELECT user_id FROM users 
                WHERE last_active <= datetime('now', '-7 days')
            """)
        
        user_ids = [row[0] for row in cursor.fetchall()]
        logger.info(f"📢 Found {len(user_ids)} users for broadcast")
        
        # Process the broadcast node
        node = next(
            (n for n in config['nodes'] if n['id'] == 'broadcast-1747126529589'),
            None
        )
        
        if not node:
            logger.error(f"❌ Broadcast node broadcast-1747126529589 not found in config")
            return
        
        success_count = 0
        fail_count = 0
        
        for user_id in user_ids:
            try:
                # Получаем следующий узел после broadcast
                next_edge = next(
                    (e for e in config['edges'] if e['source'] == node['id']),
                    None
                )
                if not next_edge:
                    logger.error(f"❌ No edge found from broadcast node broadcast-1747126529589")
                    continue
                    
                next_node = next(
                    (n for n in config['nodes'] if n['id'] == next_edge['target']),
                    None
                )
                if not next_node:
                    logger.error(f"❌ No target node found for broadcast broadcast-1747126529589")
                    continue
                
                # Обработка разных типов узлов
                node_type = next_node.get('type')
                node_data = next_node.get('data', {})
                
                if node_type == 'text':
                    text = node_data.get('text', '')
                    if text:
                        await bot.send_message(chat_id=user_id, text=text)
                        logger.info(f"📨 Sent text message to {user_id}")
                        success_count += 1
                        
                elif node_type == 'image':
                    image_url = node_data.get('url', '')
                    caption = node_data.get('caption', '')
                    
                    if image_url.startswith(('http://', 'https://')):
                        await bot.send_photo(
                            chat_id=user_id,
                            photo=image_url,
                            caption=caption
                        )
                        logger.info(f"🖼️ Sent image from URL to {user_id}")
                    elif os.path.exists(image_url):
                        with open(image_url, 'rb') as photo_file:
                            await bot.send_photo(
                                chat_id=user_id,
                                photo=types.InputFile(photo_file),
                                caption=caption
                            )
                        logger.info(f"🖼️ Sent local image to {user_id}")
                    else:
                        logger.error(f"❌ Image not found: {image_url}")
                        fail_count += 1
                        continue
                        
                    success_count += 1
                
                await asyncio.sleep(0.1)  # Задержка для избежания лимитов
                
            except Exception as e:
                logger.error(f"❌ Error in broadcast to {user_id}: {e}", exc_info=True)
                fail_count += 1
        
        logger.info(f"✅ Broadcast completed. Success: {success_count}, Failed: {fail_count}")
    except Exception as e:
        logger.error(f"🔥 Critical error in broadcast: {e}", exc_info=True)

async def setup_broadcasts():
    """Setup all broadcast tasks"""
    logger.info("⚙️ Initializing broadcast tasks...")
    # Setup broadcast for node broadcast-1747126529589
    logger.info(f"⏳ Scheduling broadcast for node broadcast-1747126529589 at 8:59 UTC (daily)")
    if 'daily' == 'daily':
        scheduler.add_job(
            broadcast_broadcast_1747126529589,
            'cron',
            hour=8,
            minute=59,
            timezone=pytz.UTC,
            id='broadcast_broadcast_1747126529589'
        )
    elif 'daily' == 'weekly':
        scheduler.add_job(
            broadcast_broadcast_1747126529589,
            'cron',
            day_of_week='mon',
            hour=8,
            minute=59,
            timezone=pytz.UTC,
            id='broadcast_broadcast_1747126529589'
        )
    elif 'daily' == 'monthly':
        scheduler.add_job(
            broadcast_broadcast_1747126529589,
            'cron',
            day=1,
            hour=8,
            minute=59,
            timezone=pytz.UTC,
            id='broadcast_broadcast_1747126529589'
        )
    elif 'daily' == 'once':
        # Run once at the specified time if it's in the future
        if datetime.now().time() < time(8, 59):
            scheduler.add_job(
                broadcast_broadcast_1747126529589,
                'date',
                run_date=datetime.combine(datetime.now().date(), time(8, 59)),
                timezone=pytz.UTC,
                id='broadcast_broadcast_1747126529589'
            )
    scheduler.start()
    logger.info(f"🚀 Scheduler started with {len(scheduler.get_jobs())} jobs")

async def save_user_info(user: types.User):
    """Save complete user info including username with proper NULL handling"""
    try:
        # Prepare data with explicit NULL conversion
        user_data = {
            'user_id': user.id,
            'username': user.username if user.username else None,
            'first_name': user.first_name if user.first_name else None,
            'last_name': user.last_name if user.last_name else None,
            'language_code': user.language_code if user.language_code else None,
            'is_bot': user.is_bot
        }
        
        logger.debug(f"💾 Saving user data: {user_data}")
        
        # Verify database connection
        try:
            db.conn.execute("SELECT 1")
        except Exception as e:
            logger.error(f"🔴 Database connection error: {e}")
            return False
            
        # Save to database
        success = db.save_user_data(user.id, 'users', user_data)
        
        if not success:
            logger.error("🔴 Failed to save user data to database")
            return False
            
        # Update last_active timestamp
        cursor = db.conn.cursor()
        cursor.execute(
            "UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = ?",
            (user.id,)
        )
        db.conn.commit()
        
        return True
    except Exception as e:
        logger.error(f"🔴 Error saving user info: {e}", exc_info=True)
        return False

async def save_user_data(user_id: int, table_name: str, data: dict) -> bool:
    """Save user data to specified table with transaction"""
    try:
        return db.save_user_data(user_id, table_name, data)
    except Exception as e:
        logger.error(f"🔴 Error saving data: {e}", exc_info=True)
        return False

async def get_user_data(user_id: int, table_name: str, limit: int = None) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    """Get user data with optional limit"""
    try:
        return db.get_user_data(user_id, table_name, limit)
    except Exception as e:
        logger.error(f"🔴 Error getting data: {e}", exc_info=True)
        return None if limit == 1 else []

async def process_next_node(message: types.Message, current_node_id: str, 
                          button_index: Optional[int] = None, depth: int = 0):
    """Process next node in flow"""
    if depth > MAX_RECURSION_DEPTH:
        logger.warning("⚠️ Maximum recursion depth reached")
        await message.answer("Произошла ошибка обработки запроса")
        return

    logger.info(f"➡️ Processing next node after {current_node_id}")

    next_edges = [
        e for e in config['edges']
        if e['source'] == current_node_id
        and (button_index is None or e.get('data', {}).get('buttonIndex') == button_index)
    ]

    if not next_edges:
        logger.warning(f"⚠️ No edges found from node {current_node_id}")
        return

    next_edge = next_edges[0]
    next_node = next(
        (n for n in config['nodes'] if n['id'] == next_edge['target']),
        None
    )

    if next_node:
        await process_node(message, next_node, depth+1)
    else:
        logger.error(f"🔴 Node {next_edge['target']} not found")

async def process_node(message: types.Message, node: Dict[str, Any], depth: int = 0):
    """Process a single node in the flow"""
    logger.debug(f"🟢 Processing node {node['id']}, user: {message.from_user}")
    save_success = await save_user_info(message.from_user)
    if not save_success:
        logger.warning("⚠️ Failed to save user info in process_node")
    
    node_type = node.get('type')
    data = node.get('data', {})
    user_id = message.from_user.id

    logger.info(f"🟢 Processing node {node['id']} of type {node_type}")

    try:
            
        if node_type == 'startend':
            await process_next_node(message, node['id'], depth=depth)

        elif node_type == 'text':
            await message.answer(data.get('text', ''))
            await process_next_node(message, node['id'], depth=depth)

        elif node_type == 'button':
            buttons = data.get('buttons', [])
            user_states[user_id] = {
                'current_node': node['id'],
                'buttons': buttons,
                'button_mapping': {btn.get('text', ''): idx for idx, btn in enumerate(buttons)}
            }

            keyboard = ReplyKeyboardMarkup(
                keyboard=[
                    [KeyboardButton(text=btn.get('text', f'Button {idx+1}'))]
                    for idx, btn in enumerate(buttons)
                ],
                resize_keyboard=True,
                one_time_keyboard=True
            )
            await message.answer(data.get('text', ''), reply_markup=keyboard)

        elif node_type == 'menu':
            items = data.get('items', [])
            user_states[user_id] = {
                'current_node': node['id'],
                'menu_items': {item.get('action', f'action_{idx}'): item for idx, item in enumerate(items)}
            }

            keyboard = ReplyKeyboardMarkup(
                keyboard=[
                    [KeyboardButton(text=item.get('text', f'Item {idx+1}'))]
                    for idx, item in enumerate(items)
                ],
                resize_keyboard=True,
                one_time_keyboard=True
            )
            await message.answer(data.get('text', ''), reply_markup=keyboard)

        elif node_type == 'inline':
            buttons = data.get('buttons', [])
            user_states[user_id] = {
                'current_node': node['id'],
                'buttons': buttons,
                'button_mapping': {btn.get('text', ''): idx for idx, btn in enumerate(buttons)}
            }

            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[
                    [InlineKeyboardButton(
                        text=btn.get('text', f'Button {idx+1}'),
                        callback_data=btn.get('action', f'action_{idx}')
                    )]
                    for idx, btn in enumerate(buttons)
                ]
            )
            await message.answer(data.get('text', ''), reply_markup=keyboard)

        elif node_type == 'image':
            image_path = data.get('url', '')
            caption = data.get('caption', '')
            try:
                if image_path.startswith(('http://', 'https://')):
                    await message.answer_photo(image_path, caption=caption)
                elif os.path.exists(image_path):
                    photo = FSInputFile(image_path)
                    await message.answer_photo(photo, caption=caption)
                else:
                    await message.answer("Image not found")
                await process_next_node(message, node['id'], depth=depth)
            except Exception as e:
                logger.error(f"🔴 Error sending image: {e}")
                await message.answer("Error sending image")

        elif node_type == 'input':
            input_config = {
                'table': data.get('table', ''),
                'column': data.get('column', ''),
                'success_message': data.get('successMessage', 'Data saved successfully')
            }

            user_states[user_id] = {
                'current_node': node['id'],
                'awaiting_input': True,
                'input_config': input_config
            }

            await message.answer(data.get('prompt', 'Please enter your input:'))

        elif node_type == 'dboutput':
            try:
                table = data.get('table', '')
                columns = data.get('columns', [])
                custom_query = data.get('customQuery', '')

                if custom_query:
                    cursor = db.conn.cursor()
                    cursor.execute(custom_query)
                    results = cursor.fetchall()
                elif table and columns:
                    cursor = db.conn.cursor()
                    cursor.execute(
                        f"SELECT {', '.join(columns)} FROM {table} WHERE user_id = ?",
                        (user_id,)
                    )
                    results = cursor.fetchall()
                else:
                    await message.answer("Configuration error")
                    return

                if results:
                    response = data.get('message', '') + "\n\n" + "\n".join(
                        [" | ".join(str(item) for item in row) for row in results]
                    )
                    await message.answer(response)
                else:
                    await message.answer(data.get('message', '') + "\n\nNo data found")

                await process_next_node(message, node['id'], depth=depth)
            except Exception as e:
                logger.error(f"🔴 Error retrieving data: {e}")
                await message.answer("Error retrieving data")

        elif node_type == 'condition':
            try:
                condition = data.get('condition', '')
                condition_met = eval(condition, {'user_id': user_id})
                
                next_edges = [
                    e for e in config['edges']
                    if e['source'] == node['id']
                    and e.get('label', '').lower() == str(condition_met).lower()
                ]

                if next_edges:
                    next_node = next(
                        (n for n in config['nodes'] if n['id'] == next_edges[0]['target']),
                        None
                    )
                    if next_node:
                        await process_node(message, next_node, depth+1)
            except Exception as e:
                logger.error(f"🔴 Error evaluating condition: {e}")
                await message.answer("Error processing condition")

    except Exception as e:
        logger.error(f"🔴 Error processing node: {e}", exc_info=True)
        await message.answer("Error processing request")

@dp.message(Command('start'))
async def start_handler(message: types.Message):
    """Handler for command /start"""
    # Save user info automatically with detailed logging
    logger.debug(f"Command handler user data: {message.from_user}")
    await save_user_info(message.from_user)
    
    start_node = next(
        (n for n in config['nodes']
         if n.get('type') == 'startend'
         and n.get('data', {}).get('isStart', True)
         and n.get('data', {}).get('command') == '/start'),
        None
    )

    if start_node:
        await process_node(message, start_node)
    else:
        await message.answer('Command not configured')

@dp.callback_query()
async def callback_handler(callback_query: types.CallbackQuery):
    try:
        await callback_query.answer()
        user_id = callback_query.from_user.id
        state = user_states.get(user_id, {})

        logger.debug(f"🟣 Callback from user: {callback_query.from_user}")
        save_success = await save_user_info(callback_query.from_user)
        if not save_success:
            logger.warning("⚠️ Failed to save user info in callback")

        if 'current_node' in state and 'buttons' in state:
            button_index = next(
                (idx for idx, btn in enumerate(state['buttons'])
                if btn.get('action', f'action_{idx}') == callback_query.data
            ), None)

            if button_index is not None:
                await callback_query.message.answer(
                    f"Вы выбрали: {state['buttons'][button_index].get('text', '')}",
                    reply_markup=ReplyKeyboardRemove()
                )
                await process_next_node(callback_query.message, state['current_node'], button_index)

    except Exception as e:
        logger.error("🔴 Error handling callback: " + str(e))
        await callback_query.answer("Ошибка обработки")

@dp.message(lambda message: message.from_user.id in user_states and 'button_mapping' in user_states[message.from_user.id])
async def button_click_handler(message: types.Message):
    try:
        user_id = message.from_user.id
        state = user_states.get(user_id, {})

        if 'current_node' in state and 'button_mapping' in state:
            button_index = state['button_mapping'].get(message.text)
            if button_index is not None:
                await message.answer(
                    f"Вы выбрали: {message.text}",
                    reply_markup=ReplyKeyboardRemove()
                )
                await process_next_node(message, state['current_node'], button_index)

    except Exception as e:
        logger.error(f"🔴 Error handling button click: {e}")
        await message.answer("Ошибка обработки")

@dp.message(lambda message: message.from_user.id in user_states and 'menu_items' in user_states[message.from_user.id])
async def menu_item_handler(message: types.Message):
    try:
        user_id = message.from_user.id
        state = user_states.get(user_id, {})

        if 'current_node' in state and 'menu_items' in state:
            selected_item = next(
                (item for item in state['menu_items'].values()
                 if item.get('text', '') == message.text),
                None
            )

            if selected_item:
                await message.answer(
                    f"Вы выбрали: {message.text}",
                    reply_markup=ReplyKeyboardRemove()
                )
                await process_next_node(message, state['current_node'])

    except Exception as e:
        logger.error(f"🔴 Error handling menu selection: {e}")
        await message.answer("Ошибка обработки")

@dp.message()
async def text_handler(message: types.Message):
    logger.info(f"📩 Message from user: {message.from_user}")
    save_success = await save_user_info(message.from_user)
    if not save_success:
        logger.error("🔴 Failed to save user info in text_handler")
    
    user_id = message.from_user.id
    state = user_states.get(user_id, {})

    if state.get('awaiting_input'):
        input_config = state.get('input_config', {})
        table = input_config.get('table')
        column = input_config.get('column')
        success_message = input_config.get('success_message', 'Data saved successfully')

        if table and column:
            data = {column: message.text}
            if await save_user_data(user_id, table, data):
                await message.answer(success_message)
            else:
                await message.answer("Error saving data")
        
        if user_id in user_states:
            user_states[user_id]['awaiting_input'] = False
        
        if 'current_node' in state:
            await process_next_node(message, state['current_node'])
    else:
        if message.text.startswith('/'):
            await message.answer("Команда не распознана")
        else:
            await message.answer(f"Вы сказали: {message.text}")

@dp.message(Command('myinfo'))
async def myinfo_handler(message: types.Message):
    """Command to show and verify saved user data"""
    try:
        user = message.from_user
        db_data = db.get_user_data(user.id, 'users', limit=1)
        
        response = (
            f"Ваши данные:\n"
            f"ID: {user.id}\n"
            f"Username: @{user.username}\n"
            f"Имя: {user.first_name}\n"
            f"Фамилия: {user.last_name}\n\n"
            f"В базе данных:\n"
            f"Username: {db_data.get('username') if db_data else 'N/A'}\n"
            f"Имя: {db_data.get('first_name') if db_data else 'N/A'}"
        )
        await message.answer(response)
    except Exception as e:
        logger.error(f"🔴 Error in myinfo handler: {e}")
        await message.answer("Ошибка при получении данных")



async def on_startup():
    """Verify database connection on startup"""
    try:
        # Test database connection
        db.conn.execute("SELECT 1")
        logger.info("🟢 Database connection verified")
        
        # Verify users table structure
        cursor = db.conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        logger.info(f"📊 Users table columns: {columns}")
        
        # Setup broadcast tasks
        logger.info("⚙️ Starting broadcast setup...")
        await setup_broadcasts()
        
        # Log scheduled jobs
        jobs = scheduler.get_jobs()
        logger.info(f"⏰ Scheduled {len(jobs)} jobs:")
        for job in jobs:
            logger.info(f"  - {job.id} (next run: {job.next_run_time})")
        
        logger.info("🚀 Bot started successfully")
    except Exception as e:
        logger.error(f"🔴 Startup error: {e}")
        raise

async def shutdown():
    """Properly close resources"""
    logger.info("🛑 Shutting down bot...")
    try:
        scheduler.shutdown()
        db.conn.close()
    except Exception as e:
        logger.error(f"🔴 Error closing resources: {e}")
    await bot.session.close()

async def main():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await on_startup()
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"🔴 Fatal error: {e}")
    finally:
        await shutdown()

if __name__ == '__main__':
    asyncio.run(main())
