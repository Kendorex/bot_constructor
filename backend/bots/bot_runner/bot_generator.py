import json
from pathlib import Path
from typing import Dict, List
import logging
import sqlite3
from datetime import datetime, time
import pytz
from django.conf import settings
from ..models import TelegramBot

logger = logging.getLogger(__name__)

class BotGenerator:
    def __init__(self, bot: TelegramBot):
        self.bot = bot

    def get_bot_directory(self) -> Path:
        bots_dir = Path(settings.BASE_DIR) / 'telegram_bots'
        bots_dir.mkdir(exist_ok=True)
        return bots_dir / f"bot_{self.bot.id}"

    def generate_bot_code(self) -> str:
        config = self.bot.config

        # Generate command handlers
        command_handlers = []
        if 'commands' in config:
            for cmd_obj in config.get('commands', []):
                if isinstance(cmd_obj, dict):
                    cmd = cmd_obj.get('name', '')
                else:
                    cmd = cmd_obj
                
                if not cmd.startswith('/'):
                    continue

                cmd_name = cmd[1:].lower()
                handler = f"""
@dp.message(Command('{cmd_name}'))
async def {cmd_name}_handler(message: types.Message):
    \"\"\"Handler for command {cmd}\"\"\"
    logger.debug(f"Command handler user data: {{message.from_user}}")
    await save_user_info(message.from_user)
    
    start_node = next(
        (n for n in config['nodes']
         if n.get('type') == 'startend'
         and n.get('data', {{}}).get('isStart', True)
         and n.get('data', {{}}).get('command') == '{cmd}'),
        None
    )

    if start_node:
        await process_node(message, start_node)
    else:
        await message.answer('Command not configured')
"""
                command_handlers.append(handler.strip())

        # Generate broadcast handlers
        broadcast_nodes = [n for n in config.get('nodes', []) if n.get('type') == 'broadcast']
        broadcast_tasks = []
        broadcast_setup = []
        if broadcast_nodes:
            for node in broadcast_nodes:
                node_id = node['id']
                safe_node_id = node_id.replace('-', '_')
                data = node.get('data', {})
                broadcast_time = data.get('broadcastTime', '09:00')
                frequency = data.get('frequency', 'daily')
                target = data.get('target', 'all')
                
                try:
                    hour, minute = map(int, broadcast_time.split(':'))
                    target_time = time(hour, minute)
                except:
                    hour, minute = 9, 0
                    target_time = time(9, 0)
                
                task_code = f"""
async def broadcast_{safe_node_id}():
    \"\"\"Broadcast task for node {node_id}\"\"\"
    try:
        logger.info(f"⏰ Starting broadcast task for node {node_id} at {{datetime.now()}}")
        
        cursor = db.conn.cursor()
        
        if '{target}' == 'all':
            cursor.execute("SELECT user_id FROM users")
        elif '{target}' == 'active':
            cursor.execute(\"\"\"
                SELECT user_id FROM users 
                WHERE last_active > datetime('now', '-7 days')
            \"\"\")
        elif '{target}' == 'inactive':
            cursor.execute(\"\"\"
                SELECT user_id FROM users 
                WHERE last_active <= datetime('now', '-7 days')
            \"\"\")
        
        user_ids = [row[0] for row in cursor.fetchall()]
        logger.info(f"📢 Found {{len(user_ids)}} users for broadcast")
        
        node = next(
            (n for n in config['nodes'] if n['id'] == '{node_id}'),
            None
        )
        
        if not node:
            logger.error(f"❌ Broadcast node {node_id} not found in config")
            return
        
        success_count = 0
        fail_count = 0
        
        for user_id in user_ids:
            try:
                next_edge = next(
                    (e for e in config['edges'] if e['source'] == node['id']),
                    None
                )
                if not next_edge:
                    continue
                    
                next_node = next(
                    (n for n in config['nodes'] if n['id'] == next_edge['target']),
                    None
                )
                if not next_node:
                    continue
                
                node_type = next_node.get('type')
                node_data = next_node.get('data', {{}})
                
                if node_type == 'text':
                    text = node_data.get('text', '')
                    if text:
                        await bot.send_message(chat_id=user_id, text=text)
                        success_count += 1
                        
                elif node_type == 'image':
                    image_url = node_data.get('images', '')
                    caption = node_data.get('content', '') or node_data.get('caption', '')
                    
                    try:
                        if image_url.startswith(('http://', 'https://')):
                            await bot.send_photo(chat_id=user_id, photo=image_url, caption=caption)
                        else:
                            await bot.send_message(chat_id=user_id, text="Image not found")
                        success_count += 1
                    except Exception as e:
                        fail_count += 1
                
            except Exception as e:
                fail_count += 1
        
        logger.info(f"✅ Broadcast completed. Success: {{success_count}}, Failed: {{fail_count}}")
    except Exception as e:
        logger.error(f"🔥 Critical error in broadcast: {{e}}", exc_info=True)
"""
                broadcast_tasks.append(task_code.strip())
                
                setup_code = f"""
    logger.info(f"⏳ Scheduling broadcast for node {node_id} at {hour}:{minute} UTC ({frequency})")
    if '{frequency}' == 'daily':
        scheduler.add_job(
            broadcast_{safe_node_id},
            'cron',
            hour={hour},
            minute={minute},
            timezone=pytz.UTC,
            id='broadcast_{safe_node_id}'
        )
    elif '{frequency}' == 'weekly':
        scheduler.add_job(
            broadcast_{safe_node_id},
            'cron',
            day_of_week='mon',
            hour={hour},
            minute={minute},
            timezone=pytz.UTC,
            id='broadcast_{safe_node_id}'
        )
    elif '{frequency}' == 'monthly':
        scheduler.add_job(
            broadcast_{safe_node_id},
            'cron',
            day=1,
            hour={hour},
            minute={minute},
            timezone=pytz.UTC,
            id='broadcast_{safe_node_id}'
        )
    elif '{frequency}' == 'once':
        if datetime.now().time() < time({hour}, {minute}):
            scheduler.add_job(
                broadcast_{safe_node_id},
                'date',
                run_date=datetime.combine(datetime.now().date(), time({hour}, {minute})),
                timezone=pytz.UTC,
                id='broadcast_{safe_node_id}'
            )
"""
                broadcast_setup.append(setup_code.strip())

        template = f"""
from aiogram import Bot, Dispatcher, types
from typing import Dict, Optional, Union, Any, List
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
from datetime import datetime, time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import pytz

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

MAX_RECURSION_DEPTH = 10

bot = Bot(token='{self.bot.token}')
dp = Dispatcher()

scheduler = AsyncIOScheduler(timezone=pytz.UTC)

user_states: Dict[int, Dict] = {{}}
user_context: Dict[int, Dict] = {{}}

config = {json.dumps(config, indent=4, ensure_ascii=False)}

{'    '.join(broadcast_tasks)}

async def setup_broadcasts():
    \"\"\"Setup all broadcast tasks\"\"\"
    logger.info("⚙️ Initializing broadcast tasks...")
    {'    '.join(broadcast_setup)}
    scheduler.start()
    logger.info(f"🚀 Scheduler started with {{len(scheduler.get_jobs())}} jobs")

async def save_user_info(user: types.User):
    \"\"\"Save complete user info\"\"\"
    try:
        user_data = {{
            'user_id': user.id,
            'username': user.username if user.username else None,
            'first_name': user.first_name if user.first_name else None,
            'last_name': user.last_name if user.last_name else None,
            'language_code': user.language_code if user.language_code else None,
            'is_bot': user.is_bot
        }}
        
        logger.debug(f"💾 Saving user data: {{user_data}}")
        
        try:
            db.conn.execute("SELECT 1")
        except Exception as e:
            logger.error(f"🔴 Database connection error: {{e}}")
            return False
            
        success = db.save_user_data(user.id, 'users', user_data)
        
        if not success:
            logger.error("🔴 Failed to save user data to database")
            return False
            
        cursor = db.conn.cursor()
        cursor.execute(
            "UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE user_id = ?",
            (user.id,)
        )
        db.conn.commit()
        
        return True
    except Exception as e:
        logger.error(f"🔴 Error saving user info: {{e}}", exc_info=True)
        return False

async def save_user_data(user_id: int, table_name: str, data: dict) -> bool:
    \"\"\"Save user data to specified table\"\"\"
    try:
        return db.save_user_data(user_id, table_name, data)
    except Exception as e:
        logger.error(f"🔴 Error saving data: {{e}}", exc_info=True)
        return False

async def get_user_data(user_id: int, table_name: str, limit: int = None) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
    \"\"\"Get user data with optional limit\"\"\"
    try:
        return db.get_user_data(user_id, table_name, limit)
    except Exception as e:
        logger.error(f"🔴 Error getting data: {{e}}", exc_info=True)
        return None if limit == 1 else []

async def process_next_node(message: types.Message, current_node_id: str, 
                          button_index: Optional[int] = None, depth: int = 0):
    \"\"\"Process next node in flow\"\"\"
    if depth > MAX_RECURSION_DEPTH:
        logger.warning("⚠️ Maximum recursion depth reached")
        await message.answer("Произошла ошибка обработки запроса")
        return

    logger.info(f"➡️ Processing next node after {{current_node_id}}")

    next_edges = [
        e for e in config['edges']
        if e['source'] == current_node_id
        and (button_index is None or e.get('data', {{}}).get('buttonIndex') == button_index)
    ]

    if not next_edges:
        logger.warning(f"⚠️ No edges found from node {{current_node_id}}")
        return

    next_edge = next_edges[0]
    next_node = next(
        (n for n in config['nodes'] if n['id'] == next_edge['target']),
        None
    )

    if next_node:
        await process_node(message, next_node, depth+1)
    else:
        logger.error(f"🔴 Node {{next_edge['target']}} not found")

async def process_node(message: types.Message, node: Dict[str, Any], depth: int = 0):
    \"\"\"Process a single node in the flow\"\"\"
    logger.debug(f"🟢 Processing node {{node['id']}}, user: {{message.from_user}}")
    save_success = await save_user_info(message.from_user)
    if not save_success:
        logger.warning("⚠️ Failed to save user info in process_node")
    
    node_type = node.get('type')
    data = node.get('data', {{}})
    user_id = message.from_user.id

    logger.info(f"🟢 Processing node {{node['id']}} of type {{node_type}}")

    try:
        if node_type == 'startend':
            await process_next_node(message, node['id'], depth=depth)

        elif node_type == 'text':
            await message.answer(data.get('text', ''))
            await process_next_node(message, node['id'], depth=depth)

        elif node_type == 'button':
            buttons = data.get('buttons', [])
            user_states[user_id] = {{
                'current_node': node['id'],
                'buttons': buttons,
                'button_mapping': {{btn.get('text', ''): idx for idx, btn in enumerate(buttons)}}
            }}

            keyboard = ReplyKeyboardMarkup(
                keyboard=[
                    [KeyboardButton(text=btn.get('text', f'Button {{idx+1}}'))]
                    for idx, btn in enumerate(buttons)
                ],
                resize_keyboard=True,
                one_time_keyboard=True
            )
            await message.answer(data.get('text', ''), reply_markup=keyboard)

        elif node_type == 'menu':
            items = data.get('items', [])
            user_states[user_id] = {{
                'current_node': node['id'],
                'menu_items': {{item.get('action', f'action_{{idx}}'): item for idx, item in enumerate(items)}}
            }}

            keyboard = ReplyKeyboardMarkup(
                keyboard=[
                    [KeyboardButton(text=item.get('text', f'Item {{idx+1}}'))]
                    for idx, item in enumerate(items)
                ],
                resize_keyboard=True,
                one_time_keyboard=True
            )
            await message.answer(data.get('text', ''), reply_markup=keyboard)

        elif node_type == 'inline':
            buttons = data.get('buttons', [])
            user_states[user_id] = {{
                'current_node': node['id'],
                'buttons': buttons,
                'button_mapping': {{btn.get('text', ''): idx for idx, btn in enumerate(buttons)}}
            }}

            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[
                    [InlineKeyboardButton(
                        text=btn.get('text', f'Button {{idx+1}}'),
                        callback_data=btn.get('action', f'action_{{idx}}')
                    )]
                    for idx, btn in enumerate(buttons)
                ]
            )
            await message.answer(data.get('text', ''), reply_markup=keyboard)

        elif node_type == 'image':
            image_path = data.get('images', '')
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
                logger.error(f"🔴 Error sending image: {{e}}")
                await message.answer("Error sending image")

        elif node_type == 'input':
            input_config = {{
                'table': data.get('table', ''),
                'column': data.get('column', ''),
                'success_message': data.get('successMessage', 'Data saved successfully'),
                'input_mode': data.get('inputMode', 'text'),
                'buttons': data.get('buttons', []),
                'save_mode': data.get('saveMode', 'new')  # 'new' or 'update_last'
            }}

            user_states[user_id] = {{
                'current_node': node['id'],
                'awaiting_input': True,
                'input_config': input_config
            }}

            if input_config['input_mode'] == 'buttons' and input_config['buttons']:
                keyboard = ReplyKeyboardMarkup(
                    keyboard=[
                        [KeyboardButton(text=btn.get('text', f'Button {{idx+1}}'))]
                        for idx, btn in enumerate(input_config['buttons'])
                    ],
                    resize_keyboard=True,
                    one_time_keyboard=True
                )
                await message.answer(data.get('prompt', 'Please select an option:'), reply_markup=keyboard)
            else:
                await message.answer(data.get('prompt', 'Please enter your input:'))

        elif node_type == 'dboutput':
            try:
                table = data.get('table', '')
                columns = data.get('columns', [])
                custom_query = data.get('customQuery', '')
                button_value_var = 'last_button_value'
                button_value = user_context.get(user_id, {{}}).get(button_value_var, '') if button_value_var else ''
                
                if custom_query:
                    if button_value:
                        safe_value = button_value.replace("'", "''")
                        query = custom_query.replace('{{button_value}}', "'"+safe_value+"'")
                    else:
                        query = custom_query
                    
                    cursor = db.conn.cursor()
                    cursor.execute(query)
                    results = cursor.fetchall()
                elif table and columns:
                    cursor = db.conn.cursor()
                    cursor.execute(
                        f"SELECT {{', '.join(columns)}} FROM {{table}} WHERE user_id = ?",
                        (user_id,)
                    )
                    results = cursor.fetchall()
                else:
                    await message.answer("Configuration error")
                    return

                if results:
                    response = data.get('message', '') + "\\n\\n" + "\\n".join(
                        [" | ".join(str(item) for item in row) for row in results]
                    )
                    await message.answer(response)
                else:
                    await message.answer(data.get('message', '') + "\\n\\nNo data found")

                await process_next_node(message, node['id'], depth=depth)
            except Exception as e:
                logger.error(f"🔴 Error retrieving data: {{e}}")
                await message.answer("Error retrieving data")

        elif node_type == 'condition':
            try:
                condition = data.get('condition', '')
                condition_met = eval(condition, {{'user_id': user_id}})
                
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
                logger.error(f"🔴 Error evaluating condition: {{e}}")
                await message.answer("Error processing condition")

    except Exception as e:
        logger.error(f"🔴 Error processing node: {{e}}", exc_info=True)
        await message.answer("Error processing request")

{'\n\n'.join(command_handlers)}

@dp.callback_query()
async def callback_handler(callback_query: types.CallbackQuery):
    try:
        await callback_query.answer()
        user_id = callback_query.from_user.id
        state = user_states.get(user_id, {{}})

        logger.debug(f"🟣 Callback from user: {{callback_query.from_user}}")
        save_success = await save_user_info(callback_query.from_user)
        if not save_success:
            logger.warning("⚠️ Failed to save user info in callback")

        if 'current_node' in state and 'buttons' in state:
            button_index = next(
                (idx for idx, btn in enumerate(state['buttons'])
                if btn.get('action', f'action_{{idx}}') == callback_query.data
            ), None)

            if button_index is not None:
                button = state['buttons'][button_index]
                button_value = button.get('value', button.get('text', ''))
                
                if user_id not in user_context:
                    user_context[user_id] = {{}}
                
                button_value_var = button.get('value_var', '')
                if button_value_var:
                    user_context[user_id][button_value_var] = button_value
                user_context[user_id]['last_button_value'] = button_value
                
                if state.get('awaiting_input'):
                    input_config = state.get('input_config', {{}})
                    table = input_config.get('table')
                    column = input_config.get('column')
                    save_mode = input_config.get('save_mode', 'new')
                    
                    if table and column:
                        data = {{column: button_value}}
                        
                        if save_mode == 'new':
                            success = await save_user_data(user_id, table, data)
                        elif save_mode == 'update_last':
                            success = db.update_last_record(user_id, table, data)
                        
                        if success:
                            await callback_query.message.answer(
                                input_config.get('success_message', 'Данные сохранены'),
                                reply_markup=ReplyKeyboardRemove()
                            )
                        else:
                            await callback_query.message.answer(
                                "Ошибка сохранения данных",
                                reply_markup=ReplyKeyboardRemove()
                            )
                        
                        if user_id in user_states:
                            user_states[user_id]['awaiting_input'] = False
                        
                        await process_next_node(callback_query.message, state['current_node'])
                        return
                
                await callback_query.message.answer(
                    f"Вы выбрали: {{button.get('text', '')}}",
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
        state = user_states.get(user_id, {{}})

        if 'current_node' in state and 'button_mapping' in state:
            button_index = state['button_mapping'].get(message.text)
            if button_index is not None:
                button = state['buttons'][button_index]
                button_value = button.get('value', button.get('text', ''))
                
                if user_id not in user_context:
                    user_context[user_id] = {{}}
                
                button_value_var = button.get('value_var', '')
                if button_value_var:
                    user_context[user_id][button_value_var] = button_value
                user_context[user_id]['last_button_value'] = button_value
                
                await message.answer(
                    f"Вы выбрали: {{message.text}}",
                    reply_markup=ReplyKeyboardRemove()
                )
                await process_next_node(message, state['current_node'], button_index)

    except Exception as e:
        logger.error(f"🔴 Error handling button click: {{e}}")
        await message.answer("Ошибка обработки")

@dp.message(lambda message: message.from_user.id in user_states and 'menu_items' in user_states[message.from_user.id])
async def menu_item_handler(message: types.Message):
    try:
        user_id = message.from_user.id
        state = user_states.get(user_id, {{}})

        if 'current_node' in state and 'menu_items' in state:
            selected_item = next(
                (item for item in state['menu_items'].values()
                 if item.get('text', '') == message.text),
                None
            )

            if selected_item:
                item_value = selected_item.get('value', selected_item.get('text', ''))
                
                if user_id not in user_context:
                    user_context[user_id] = {{}}
                
                item_value_var = selected_item.get('value_var', '')
                if item_value_var:
                    user_context[user_id][item_value_var] = item_value
                user_context[user_id]['last_button_value'] = item_value
                
                await message.answer(
                    f"Вы выбрали: {{message.text}}",
                    reply_markup=ReplyKeyboardRemove()
                )
                await process_next_node(message, state['current_node'])

    except Exception as e:
        logger.error(f"🔴 Error handling menu selection: {{e}}")
        await message.answer("Ошибка обработки")

@dp.message()
async def text_handler(message: types.Message):
    logger.info(f" Message from user: {{message.from_user}}")
    save_success = await save_user_info(message.from_user)
    if not save_success:
        logger.error(" Failed to save user info in text_handler")
    
    user_id = message.from_user.id
    state = user_states.get(user_id, {{}})

    if state.get('awaiting_input'):
        input_config = state.get('input_config', {{}})
        table = input_config.get('table')
        column = input_config.get('column')
        success_message = input_config.get('success_message', 'Data saved successfully')
        input_mode = input_config.get('input_mode', 'text')
        buttons = input_config.get('buttons', [])
        save_mode = input_config.get('save_mode', 'new')  # 'new' or 'update_last'

        if table and column:
            # Handle different input modes
            if input_mode == 'buttons':
                selected_button = next(
                    (btn for btn in buttons if btn.get('text') == message.text),
                    None
                )
                if selected_button:
                    data = {{column: selected_button.get('value', message.text)}}
                else:
                    await message.answer("Неверный выбор, попробуйте еще раз")
                    return
            else:
                data = {{column: message.text}}

            # Handle save modes
            try:
                if save_mode == 'new':
                    success = await save_user_data(user_id, table, data)
                elif save_mode == 'update_last':
                    success = db.update_last_record(user_id, table, data)
                
                if success:
                    await message.answer(success_message, reply_markup=ReplyKeyboardRemove())
                else:
                    await message.answer("Ошибка сохранения данных", reply_markup=ReplyKeyboardRemove())
            except Exception as e:
                logger.error(f"Error saving data: {{e}}")
                await message.answer("Ошибка сохранения данных", reply_markup=ReplyKeyboardRemove())
                success = False
        
        if user_id in user_states:
            user_states[user_id]['awaiting_input'] = False
        
        if 'current_node' in state:
            await process_next_node(message, state['current_node'])
    else:
        if message.text.startswith('/'):
            await message.answer("Команда не распознана")
        else:
            await message.answer(f"Вы сказали: {{message.text}}")

@dp.message(Command('myinfo'))
async def myinfo_handler(message: types.Message):
    \"\"\"Command to show and verify saved user data\"\"\"
    try:
        user = message.from_user
        db_data = db.get_user_data(user.id, 'users', limit=1)
        
        response = (
            f"Ваши данные:\\n"
            f"ID: {{user.id}}\\n"
            f"Username: @{{user.username}}\\n"
            f"Имя: {{user.first_name}}\\n"
            f"Фамилия: {{user.last_name}}\\n\\n"
            f"В базе данных:\\n"
            f"Username: {{db_data.get('username') if db_data else 'N/A'}}\\n"
            f"Имя: {{db_data.get('first_name') if db_data else 'N/A'}}"
        )
        await message.answer(response)
    except Exception as e:
        logger.error(f"🔴 Error in myinfo handler: {{e}}")
        await message.answer("Ошибка при получении данных")

@dp.message(Command('mychoices'))
async def mychoices_handler(message: types.Message):
    \"\"\"Command to show user's saved choices\"\"\"
    try:
        user_id = message.from_user.id
        choices = db.get_user_data(user_id, 'user_choices')
        
        if not choices:
            await message.answer("У вас нет сохраненных выборов")
            return
            
        response = "Ваши сохраненные выборы:\\n\\n"
        for choice in choices:
            response += f"• {{choice.get('key')}}: {{choice.get('value')}}\\n"
            response += f"  ({{datetime.fromisoformat(choice.get('timestamp')).strftime('%Y-%m-%d %H:%M')}})\\n\\n"
        
        await message.answer(response)
    except Exception as e:
        logger.error(f"🔴 Error in mychoices handler: {{e}}")
        await message.answer("Ошибка при получении данных")

async def on_startup():
    \"\"\"Verify database connection on startup\"\"\"
    try:
        db.conn.execute("SELECT 1")
        logger.info("🟢 Database connection verified")
        
        cursor = db.conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        logger.info(f"📊 Users table columns: {{columns}}")
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS user_choices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )''')
        db.conn.commit()
        logger.info("🟢 Created user_choices table")
        
        logger.info("⚙️ Starting broadcast setup...")
        await setup_broadcasts()
        
        jobs = scheduler.get_jobs()
        logger.info(f"⏰ Scheduled {{len(jobs)}} jobs:")
        for job in jobs:
            logger.info(f"  - {{job.id}} (next run: {{job.next_run_time}})")
        
        logger.info("🚀 Bot started successfully")
    except Exception as e:
        logger.error(f"🔴 Startup error: {{e}}")
        raise

async def shutdown():
    \"\"\"Properly close resources\"\"\"
    logger.info("🛑 Shutting down bot...")
    try:
        scheduler.shutdown()
        db.conn.close()
    except Exception as e:
        logger.error(f"🔴 Error closing resources: {{e}}")
    await bot.session.close()

async def main():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await on_startup()
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"🔴 Fatal error: {{e}}")
    finally:
        await shutdown()

if __name__ == '__main__':
    asyncio.run(main())
"""
        return template

    def create_bot_file(self) -> Path:
        bot_dir = self.get_bot_directory()
        bot_file = bot_dir / 'bot.py'

        bot_dir.mkdir(parents=True, exist_ok=True)

        try:
            bot_code = self.generate_bot_code()
            with open(bot_file, 'w', encoding='utf-8') as f:
                f.write(bot_code)
            logger.info(f"✅ Bot file created at {bot_file}")
            return bot_file
        except Exception as e:
            logger.error(f"🔴 Error creating bot file: {e}")
            raise